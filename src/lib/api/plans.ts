/**
 * Single source of truth for plan tiers.
 *
 * Used by:
 * - The dashboard plan section (display)
 * - The API auth/rate-limit helper (enforcement)
 * - The future Stripe checkout flow (price IDs)
 *
 * Free has zero API access by design: the web tools are public, the API tier
 * is paid only.
 */

export type PlanId = "free" | "pro" | "team"

export interface PlanInfo {
  id: PlanId
  name: string
  /** Monthly subscription price in USD. Zero for free. */
  priceUsd: number
  /** Hard ceiling on POST /api/v1/* requests per calendar month. */
  monthlyApiRequests: number
  description: string
}

export const PLAN_TIERS: Record<PlanId, PlanInfo> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    monthlyApiRequests: 0,
    description:
      "Web tools only — Validator, Config Generator, Schema Builder. No API access.",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 19,
    monthlyApiRequests: 10_000,
    description: "For solo devs shipping integrations.",
  },
  team: {
    id: "team",
    name: "Team",
    priceUsd: 49,
    monthlyApiRequests: 100_000,
    description: "For teams running CI validation at scale.",
  },
}

export function getPlan(planId: string): PlanInfo {
  return PLAN_TIERS[planId as PlanId] ?? PLAN_TIERS.free
}

/**
 * Resolve a plan ID to its Stripe price ID at request time. Returns null if
 * the env var is not set (e.g., Stripe not configured) or the plan is the
 * free tier (no price). Server-only — env vars without `NEXT_PUBLIC_` prefix
 * are not exposed to the client bundle.
 */
export function getStripePriceId(planId: PlanId): string | null {
  if (planId === "pro") return process.env.STRIPE_PRICE_PRO ?? null
  if (planId === "team") return process.env.STRIPE_PRICE_TEAM ?? null
  return null
}

/**
 * Reverse lookup: given a Stripe price ID (from a webhook event or
 * subscription line item), return the matching plan tier or null if it
 * doesn't correspond to any of our managed prices.
 */
export function getPlanByPriceId(
  priceId: string | null | undefined,
): PlanInfo | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_PRO) return PLAN_TIERS.pro
  if (priceId === process.env.STRIPE_PRICE_TEAM) return PLAN_TIERS.team
  return null
}
