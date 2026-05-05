import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getStripePriceId,
  type PlanId,
} from "@/lib/api/plans"
import { getOrCreateUser } from "@/lib/db/users"
import { getSiteUrl, getStripe, isStripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured on this deployment." },
      { status: 503 },
    )
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Body must be valid JSON." },
      { status: 400 },
    )
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("planId" in body)
  ) {
    return NextResponse.json(
      { error: "Body must include { planId: 'pro' | 'team' }." },
      { status: 400 },
    )
  }

  const planId = (body as { planId: unknown }).planId
  if (planId !== "pro" && planId !== "team") {
    return NextResponse.json(
      { error: "planId must be 'pro' or 'team'." },
      { status: 400 },
    )
  }

  const priceId = getStripePriceId(planId as PlanId)
  if (!priceId) {
    return NextResponse.json(
      {
        error: `STRIPE_PRICE_${planId.toUpperCase()} env var is not set; cannot start checkout for ${planId}.`,
      },
      { status: 503 },
    )
  }

  const dbUser = await getOrCreateUser(userId)
  const stripe = getStripe()
  const siteUrl = getSiteUrl()

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing?canceled=true`,
    client_reference_id: dbUser.id,
    customer: dbUser.stripeCustomerId ?? undefined,
    customer_email: dbUser.stripeCustomerId ? undefined : dbUser.email,
    subscription_data: {
      metadata: { user_id: dbUser.id, plan_id: planId },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  })

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe returned no checkout URL." },
      { status: 500 },
    )
  }

  return NextResponse.json({ url: session.url })
}
