import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { getDb, isDbConfigured, schema } from "@/lib/db"

export const runtime = "nodejs"

const ID_RE = /^[A-Za-z0-9]{4,32}$/

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params

  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 })
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Sharing is not configured on this deployment." },
      { status: 503 },
    )
  }

  const db = getDb()
  const rows = await db
    .select({ config: schema.sharedConfigs.config })
    .from(schema.sharedConfigs)
    .where(eq(schema.sharedConfigs.id, id))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  void db
    .update(schema.sharedConfigs)
    .set({
      viewCount: sql`${schema.sharedConfigs.viewCount} + 1`,
      lastViewedAt: sql`now()`,
    })
    .where(eq(schema.sharedConfigs.id, id))
    .catch((err) => console.error("view-count update failed", err))

  return NextResponse.json(
    { id, config: rows[0].config },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  )
}
