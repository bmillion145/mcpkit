import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import { getPlanByPriceId } from "@/lib/api/plans"
import { getDb, isDbConfigured, schema } from "@/lib/db"
import { getStripe, isStripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return new Response("Stripe not configured", { status: 503 })
  }
  if (!isDbConfigured()) {
    return new Response("Database not configured", { status: 503 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
    return new Response("Webhook not configured", { status: 503 })
  }

  const sig = (await headers()).get("stripe-signature")
  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  const body = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error("Stripe webhook verification failed", err)
    return new Response("Invalid signature", { status: 400 })
  }

  const db = getDb()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userRowId = session.client_reference_id
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null)
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null)

        if (!userRowId || !customerId || !subId) {
          console.warn(
            "checkout.session.completed missing fields",
            { userRowId, customerId, subId },
          )
          break
        }

        const sub = await stripe.subscriptions.retrieve(subId)
        const priceId = sub.items.data[0]?.price.id
        const plan = getPlanByPriceId(priceId)
        if (!plan) {
          console.warn(
            `checkout.session.completed: price ${priceId} doesn't map to any known plan`,
          )
          break
        }

        await db
          .update(schema.users)
          .set({
            stripeCustomerId: customerId,
            planTier: plan.id,
          })
          .where(eq(schema.users.id, userRowId))
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id
        const priceId = sub.items.data[0]?.price.id
        const plan = getPlanByPriceId(priceId)
        if (!plan) {
          console.warn(
            `customer.subscription.updated: price ${priceId} doesn't map`,
          )
          break
        }
        const isActive = sub.status === "active" || sub.status === "trialing"
        const newTier = isActive ? plan.id : "free"

        await db
          .update(schema.users)
          .set({ planTier: newTier })
          .where(eq(schema.users.stripeCustomerId, customerId))
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id
        await db
          .update(schema.users)
          .set({ planTier: "free" })
          .where(eq(schema.users.stripeCustomerId, customerId))
        break
      }

      default:
        // Unhandled events ack with 200 so Stripe doesn't retry forever.
        break
    }
  } catch (err) {
    console.error(`Stripe webhook ${event.type} handler failed`, err)
    return new Response("Handler error", { status: 500 })
  }

  return new Response(null, { status: 200 })
}
