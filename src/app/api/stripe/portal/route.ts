import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/db/users"
import { getSiteUrl, getStripe, isStripeConfigured } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST() {
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

  const dbUser = await getOrCreateUser(userId)
  if (!dbUser.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active subscription. Subscribe first at /pricing." },
      { status: 400 },
    )
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${getSiteUrl()}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
