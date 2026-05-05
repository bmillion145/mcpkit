import type { Metadata } from "next"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { SignOutButton, UserButton } from "@clerk/nextjs"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ApiKeysSection, type KeyRow } from "@/components/dashboard/api-keys-section"
import { PlanSection } from "@/components/dashboard/plan-section"
import { UsageChart, type UsagePoint } from "@/components/dashboard/usage-chart"
import { getDb, isDbConfigured, schema } from "@/lib/db"
import { getOrCreateUser } from "@/lib/db/users"
import type { User } from "@/lib/db/schema"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const user = await currentUser()
  const displayName =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "there"

  // Resolve our local DB user. The Clerk webhook normally creates the row at
  // signup time; getOrCreateUser is the safety net for missed/lagged webhooks.
  let dbUser: User | null = null
  if (user && isDbConfigured()) {
    try {
      dbUser = await getOrCreateUser(user.id)
    } catch (err) {
      console.error("getOrCreateUser failed", err)
    }
  }

  let keys: KeyRow[] = []
  let usageByDay: UsagePoint[] = []
  let monthlyUsage = 0

  if (dbUser) {
    const db = getDb()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)

    const [keyRows, usageRows, monthlyTotalRows] = await Promise.all([
      db
        .select({
          id: schema.apiKeys.id,
          name: schema.apiKeys.name,
          keyPrefix: schema.apiKeys.keyPrefix,
          createdAt: schema.apiKeys.createdAt,
          lastUsedAt: schema.apiKeys.lastUsedAt,
          revokedAt: schema.apiKeys.revokedAt,
        })
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.userId, dbUser.id))
        .orderBy(desc(schema.apiKeys.createdAt)),

      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${schema.apiUsage.createdAt}) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.apiUsage)
        .innerJoin(
          schema.apiKeys,
          eq(schema.apiUsage.apiKeyId, schema.apiKeys.id),
        )
        .where(
          and(
            eq(schema.apiKeys.userId, dbUser.id),
            gte(schema.apiUsage.createdAt, thirtyDaysAgo),
          ),
        )
        .groupBy(sql`date_trunc('day', ${schema.apiUsage.createdAt})`)
        .orderBy(sql`date_trunc('day', ${schema.apiUsage.createdAt})`),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.apiUsage)
        .innerJoin(
          schema.apiKeys,
          eq(schema.apiUsage.apiKeyId, schema.apiKeys.id),
        )
        .where(
          and(
            eq(schema.apiKeys.userId, dbUser.id),
            gte(schema.apiUsage.createdAt, monthStart),
          ),
        ),
    ])

    keys = keyRows.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
    }))
    usageByDay = usageRows.map((r) => ({ day: r.day, count: r.count }))
    monthlyUsage = monthlyTotalRows[0]?.count ?? 0
  }

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
          <h1 className="text-sm font-semibold tracking-tight">Dashboard</h1>
          <Badge variant="secondary" className="font-mono text-[10px]">
            beta
          </Badge>
          <div className="ml-auto" />
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        <section>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {displayName}.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Manage API keys, see usage, and pick a plan.
          </p>
        </section>

        {!isDbConfigured() && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 text-sm text-amber-200">
            Database is not configured on this deployment. API keys and usage
            won&apos;t persist until <code className="font-mono">DATABASE_URL</code> is set.
          </div>
        )}

        {dbUser && (
          <>
            <ApiKeysSection keys={keys} />

            <section className="rounded-xl border border-border/60 bg-card/40">
              <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <h3 className="text-base font-medium">Usage</h3>
                  <p className="text-xs text-muted-foreground">
                    Requests over the last 30 days.
                  </p>
                </div>
              </header>
              <div className="px-5 py-5">
                <UsageChart data={usageByDay} />
              </div>
            </section>

            <PlanSection
              planId={dbUser.planTier}
              monthlyUsage={monthlyUsage}
              stripeCustomerId={dbUser.stripeCustomerId}
            />
          </>
        )}

        <section className="rounded-xl border border-border/60 bg-card/40">
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-base font-medium">Account</h3>
            <SignOutButton>
              <Button size="sm" variant="ghost">
                Sign out
              </Button>
            </SignOutButton>
          </header>
          <dl className="space-y-2 px-5 py-5 text-sm">
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">Email</dt>
              <dd className="font-mono">
                {user?.primaryEmailAddress?.emailAddress ?? "—"}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs text-muted-foreground">
                {user?.id ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild variant="outline" className="justify-start">
            <Link href="/validator">Open Validator</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/config-generator">Open Config Generator</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/schema-builder">Open Schema Builder</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
