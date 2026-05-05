import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SubscribeButton } from "@/components/pricing/subscribe-button"
import { PLAN_TIERS, type PlanInfo } from "@/lib/api/plans"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free web tools, paid API. Pro for individuals, Team for CI/CD at scale.",
}

interface DisplayPlan {
  plan: PlanInfo
  highlight?: boolean
  features: string[]
}

const FREE_FEATURES = [
  "Validator, Config Generator, Schema Builder",
  "Browser-only, no signup required",
  "Share configs by URL",
  "Open-source on GitHub",
]

const PRO_FEATURES = [
  "10,000 API requests / month",
  "Same engine as the free web tools",
  "CI-ready: drop the validator into GitHub Actions",
  "Email support",
]

const TEAM_FEATURES = [
  "100,000 API requests / month",
  "Everything in Pro",
  "Higher rate limits for spiky CI traffic",
  "Priority support",
]

const DISPLAY_PLANS: DisplayPlan[] = [
  { plan: PLAN_TIERS.pro, highlight: true, features: PRO_FEATURES },
  { plan: PLAN_TIERS.team, features: TEAM_FEATURES },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-6">
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-sm font-semibold tracking-tight">Pricing</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Simple, fair pricing
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            The web tools are free forever. Pay only when you want to drop the
            validator into your own systems via the API.
          </p>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          <FreeCard />
          {DISPLAY_PLANS.map((d) => (
            <PaidCard key={d.plan.id} display={d} />
          ))}
        </section>

        <p className="mt-14 text-center text-xs text-muted-foreground">
          Test mode for now. Use Stripe&apos;s test card{" "}
          <code className="font-mono">4242 4242 4242 4242</code> with any
          future date and any CVC.
        </p>
      </main>
    </div>
  )
}

function FreeCard() {
  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader title={PLAN_TIERS.free.name} priceLabel="$0" />
      <p className="text-sm text-muted-foreground">
        {PLAN_TIERS.free.description}
      </p>
      <Separator className="bg-border/60" />
      <FeatureList features={FREE_FEATURES} />
      <Button asChild variant="outline" className="w-full">
        <Link href="/validator">Open the Validator</Link>
      </Button>
    </Card>
  )
}

function PaidCard({ display }: { display: DisplayPlan }) {
  const { plan, highlight, features } = display
  return (
    <Card
      className={cn(
        "border-border/60 bg-card/40",
        highlight &&
          "relative border-primary/30 bg-card/60 ring-1 ring-primary/20",
      )}
    >
      {highlight && (
        <Badge className="absolute -top-3 left-6 rounded-full font-mono text-[10px]">
          Most popular
        </Badge>
      )}
      <CardHeader
        title={plan.name}
        priceLabel={`$${plan.priceUsd}`}
        priceSuffix="/mo"
      />
      <p className="text-sm text-muted-foreground">{plan.description}</p>
      <Separator className="bg-border/60" />
      <FeatureList features={features} />
      <SubscribeButton planId={plan.id} highlight={highlight}>
        Subscribe to {plan.name}
      </SubscribeButton>
    </Card>
  )
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-xl border p-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

function CardHeader({
  title,
  priceLabel,
  priceSuffix,
}: {
  title: string
  priceLabel: string
  priceSuffix?: string
}) {
  return (
    <div>
      <h3 className="text-sm font-medium tracking-tight text-muted-foreground">
        {title}
      </h3>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight">
          {priceLabel}
        </span>
        {priceSuffix && (
          <span className="text-sm text-muted-foreground">{priceSuffix}</span>
        )}
      </p>
    </div>
  )
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-2.5">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          <Check
            className="mt-0.5 size-4 shrink-0 text-emerald-400"
            strokeWidth={3}
          />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  )
}
