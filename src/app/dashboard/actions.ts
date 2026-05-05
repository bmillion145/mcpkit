"use server"

import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { customAlphabet } from "nanoid"
import { getDb, schema } from "@/lib/db"
import { getOrCreateUser } from "@/lib/db/users"

const generateSuffix = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  32,
)

export interface CreateKeyResult {
  ok: true
  key: string
  prefix: string
}

export interface ActionError {
  ok: false
  error: string
}

export async function createApiKey(
  formData: FormData,
): Promise<CreateKeyResult | ActionError> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Unauthorized" }

  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 80)
  if (!name) return { ok: false, error: "Name is required" }

  const dbUser = await getOrCreateUser(userId)

  const suffix = generateSuffix()
  const key = `mcpk_live_${suffix}`
  const hash = createHash("sha256").update(key).digest("hex")
  const prefix = key.slice(0, 14) // "mcpk_live_xxxx"

  const db = getDb()
  await db.insert(schema.apiKeys).values({
    userId: dbUser.id,
    name,
    keyPrefix: prefix,
    keyHash: hash,
  })

  revalidatePath("/dashboard")
  return { ok: true, key, prefix }
}

export async function revokeApiKey(
  formData: FormData,
): Promise<{ ok: true } | ActionError> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Unauthorized" }

  const id = String(formData.get("id") ?? "")
  if (!id) return { ok: false, error: "Missing key id" }

  const dbUser = await getOrCreateUser(userId)
  const db = getDb()

  const result = await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.apiKeys.id, id),
        eq(schema.apiKeys.userId, dbUser.id),
      ),
    )
    .returning({ id: schema.apiKeys.id })

  if (result.length === 0) {
    return { ok: false, error: "Key not found" }
  }

  revalidatePath("/dashboard")
  return { ok: true }
}
