import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getPlan } from "@/lib/api/plans"
import { ManageBillingButton } from "@/components/dashboard/manage-billing-button"

export { PLAN_TIERS, type PlanInfo } from "@/lib/api/plans"

export function PlanSection({
  planId,
  monthlyUsage,
  stripeCustomerId,
}: {
  planId: string
  monthlyUsage: number
  stripeCustomerId: string | null
}) {
  const plan = getPlan(planId)
  const hasApiAccess = plan.monthlyApiRequests > 0
  const pct = hasApiAccess
    ? Math.min(100, Math.round((monthlyUsage / plan.monthlyApiRequests) * 100))
    : 0
  const remaining = Math.max(0, plan.monthlyApiRequests - monthlyUsage)
  const overLimit =
    hasApiAccess && monthlyUsage >= plan.monthlyApiRequests

  return (
    <section className="rounded-xl border border-border/60 bg-card/40">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-medium">Plan</h3>
          <Badge variant="secondary" className="font-mono">
            {plan.name}
          </Badge>
          {plan.priceUsd > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              ${plan.priceUsd}/mo
            </span>
          )}
        </div>
        {plan.id === "free" ? (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/pricing">
              <Sparkles className="size-3.5" />
              Upgrade
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        ) : stripeCustomerId ? (
          <ManageBillingButton />
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href="/pricing">Change plan</Link>
          </Button>
        )}
      </header>

      <div className="space-y-4 px-5 py-5">
        <p className="text-sm text-muted-foreground">{plan.description}</p>

        {hasApiAccess ? (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">API usage this month</span>
              <span className="font-mono">
                {monthlyUsage.toLocaleString()} /{" "}
                {plan.monthlyApiRequests.toLocaleString()}{" "}
                <span className="text-muted-foreground">requests</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  overLimit
                    ? "bg-red-500/70"
                    : pct > 80
                      ? "bg-amber-500/70"
                      : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-xs",
                overLimit ? "text-red-400" : "text-muted-foreground",
              )}
            >
              {overLimit
                ? "Over the monthly limit. New API requests are rejected with 429 until the cycle resets."
                : `${remaining.toLocaleString()} requests remaining this cycle.`}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-muted/20 p-4 text-sm">
            <p className="font-medium">API access requires a paid plan.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The web tools — Validator, Config Generator, Schema Builder —
              stay free. Upgrade to Pro ($
              {19}/mo) to call <code className="font-mono">/api/v1/validate</code>{" "}
              from your CI or scripts.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
