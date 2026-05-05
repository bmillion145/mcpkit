import "server-only"
import { eq } from "drizzle-orm"
import { clerkClient } from "@clerk/nextjs/server"
import { getDb, schema } from "@/lib/db"
import type { User } from "@/lib/db/schema"

/**
 * Idempotently ensure a row exists in our `users` table for the given Clerk user.
 *
 * - If the row exists, returns it.
 * - If not, fetches the canonical user from Clerk and inserts.
 * - Concurrent calls are safe: the insert uses `ON CONFLICT (clerk_id) DO UPDATE`,
 *   so two simultaneous callers both end up with the same row.
 *
 * Use this anywhere you need a guaranteed local user record — typically right after
 * `auth()` succeeds in a route handler or server action. The Clerk webhook keeps the
 * row up to date in the background, but this is the safety net for races / missed
 * webhooks.
 */
export async function getOrCreateUser(clerkId: string): Promise<User> {
  const db = getDb()

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkId, clerkId))
    .limit(1)
  if (existing.length > 0) return existing[0]

  const client = await clerkClient()
  const u = await client.users.getUser(clerkId)
  const primaryEmail =
    u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
      ?.emailAddress ?? u.emailAddresses[0]?.emailAddress

  if (!primaryEmail) {
    throw new Error(`Clerk user ${clerkId} has no email address`)
  }

  const [created] = await db
    .insert(schema.users)
    .values({ clerkId, email: primaryEmail })
    .onConflictDoUpdate({
      target: schema.users.clerkId,
      set: { email: primaryEmail },
    })
    .returning()
  return created
}

/** Look up a local user by Clerk ID without creating one. */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkId, clerkId))
    .limit(1)
  return rows[0] ?? null
}
