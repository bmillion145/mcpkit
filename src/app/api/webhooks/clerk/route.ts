import { headers } from "next/headers"
import { Webhook } from "svix"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { getDb, isDbConfigured, schema } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set")
    return new Response("Webhook not configured", { status: 503 })
  }
  if (!isDbConfigured()) {
    return new Response("Database not configured", { status: 503 })
  }

  const h = await headers()
  const svixId = h.get("svix-id")
  const svixTimestamp = h.get("svix-timestamp")
  const svixSignature = h.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  const body = await req.text()

  let evt: WebhookEvent
  try {
    const wh = new Webhook(secret)
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Clerk webhook signature verification failed", err)
    return new Response("Invalid signature", { status: 400 })
  }

  const db = getDb()

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const u = evt.data
        const primaryEmail =
          u.email_addresses.find(
            (e) => e.id === u.primary_email_address_id,
          )?.email_address ?? u.email_addresses[0]?.email_address

        if (!primaryEmail) {
          console.warn(
            `Clerk webhook ${evt.type}: user ${u.id} has no email; skipping`,
          )
          return new Response(null, { status: 200 })
        }

        await db
          .insert(schema.users)
          .values({ clerkId: u.id, email: primaryEmail })
          .onConflictDoUpdate({
            target: schema.users.clerkId,
            set: { email: primaryEmail },
          })
        break
      }

      case "user.deleted": {
        const id = evt.data.id
        if (id) {
          await db.delete(schema.users).where(eq(schema.users.clerkId, id))
        }
        break
      }

      default:
        // Unhandled events are acknowledged so Clerk doesn't retry forever.
        break
    }
  } catch (err) {
    console.error(`Clerk webhook ${evt.type} handler failed`, err)
    return new Response("Handler error", { status: 500 })
  }

  return new Response(null, { status: 200 })
}
