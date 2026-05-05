import "server-only"
import Stripe from "stripe"

let cached: Stripe | null = null

/**
 * Lazy server-side Stripe client. Throws if `STRIPE_SECRET_KEY` is missing —
 * call `isStripeConfigured()` first if you want to gracefully no-op instead.
 */
export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local or Vercel env.",
    )
  }
  cached = new Stripe(key, {
    typescript: true,
  })
  return cached
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mcpkit.vercel.app"
  ).replace(/\/$/, "")
}
