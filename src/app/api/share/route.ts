import { NextResponse } from "next/server"
import { customAlphabet } from "nanoid"
import { getDb, isDbConfigured, schema } from "@/lib/db"

const MAX_BYTES = 256 * 1024
const newId = customAlphabet(
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  10,
)

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Sharing is not configured on this deployment." },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const config =
    typeof body === "object" && body !== null && "config" in body
      ? (body as Record<string, unknown>).config
      : undefined

  if (typeof config !== "string" || config.length === 0) {
    return NextResponse.json(
      { error: "Body must be { config: string }." },
      { status: 400 },
    )
  }

  const byteLength = new TextEncoder().encode(config).length
  if (byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `Config exceeds ${MAX_BYTES} bytes (got ${byteLength}).` },
      { status: 413 },
    )
  }

  const db = getDb()
  const id = newId()

  try {
    await db.insert(schema.sharedConfigs).values({ id, config })
  } catch (err) {
    console.error("share insert failed", err)
    return NextResponse.json(
      { error: "Failed to persist share." },
      { status: 500 },
    )
  }

  return NextResponse.json({ id }, { status: 201 })
}
