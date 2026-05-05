# MCPKit

Free MCP server validator and config tools, with a paid API tier.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI components:** shadcn/ui (slate base color, dark mode default)
- **Auth:** Clerk
- **Database:** Neon Postgres
- **Payments:** Stripe

## Key directories

- `src/app/` — App Router routes, layouts, pages, route handlers
- `src/components/ui/` — shadcn/ui primitives (do not edit manually; regenerate via `npx shadcn add <name>`)
- `src/components/` — application-level components built on top of `ui/`
- `src/lib/` — shared utilities (`utils.ts` exports `cn`); add Stripe and Clerk helpers here
- `src/lib/db/` — Drizzle schema + Neon client (`getDb()`, `isDbConfigured()`); import from `@/lib/db`
- `src/app/api/` — route handlers for the paid API tier and webhooks (Stripe, Clerk)
- `src/app/api/v1/` — paid API endpoints. `validate/route.ts` exists; all `/api/v1/*` handlers must call `authenticateApiKey` + `checkRateLimit` + `logUsage` from `@/lib/api/auth`
- `src/app/api/stripe/checkout/route.ts` — POST creates a Checkout Session for `{ planId: "pro" | "team" }`
- `src/app/api/stripe/portal/route.ts` — POST creates a Customer Portal session for the signed-in user (must have a `stripe_customer_id`)
- `src/app/api/webhooks/stripe/route.ts` — handles `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted` and updates `users.plan_tier` + `users.stripe_customer_id`
- `src/app/api/webhooks/clerk/route.ts` — Clerk → users-table sync (svix-verified). Add new event types here as needed
- `src/lib/stripe.ts` — `getStripe()` singleton, `isStripeConfigured()`, `getSiteUrl()`. Server-only. Never instantiate Stripe elsewhere
- `src/lib/api/plans.ts` — single source of truth for plan tiers and limits (`PLAN_TIERS`, `getPlan`, `getStripePriceId`, `getPlanByPriceId`). Imported by billing UI, rate-limit enforcement, and Stripe webhook
- `src/lib/api/auth.ts` — `authenticateApiKey(req)`, `checkRateLimit(user)`, `logUsage(...)`, `errorResponse(...)`. Postgres-backed monthly counter (no Redis dependency)
- `src/lib/db/users.ts` — `getOrCreateUser(clerkId)` and `getUserByClerkId(clerkId)`. Use `getOrCreateUser` from any server context that needs a guaranteed local user row (handles missed-webhook races via `ON CONFLICT DO UPDATE`)
- `src/middleware.ts` — Clerk middleware (`clerkMiddleware`); protected routes are listed in `createRouteMatcher` (currently `/dashboard(.*)`)
- `drizzle/` — generated SQL migrations and journal; do not edit applied files
- `scripts/db-migrate.ts` — runs migrations against `DATABASE_URL` via `npm run db:migrate`
- `public/` — static assets
- `components.json` — shadcn/ui config (slate base color)
- `drizzle.config.ts` — drizzle-kit config; reads `DATABASE_URL` from `.env.local`

## Coding conventions

- **TypeScript strict mode** — no `any`, no `// @ts-ignore` without a reason in a comment
- **Server components by default** — only add `"use client"` when the file actually needs hooks, browser APIs, or event handlers
- **All UI uses shadcn components** — prefer composing primitives from `src/components/ui/` over hand-rolled markup; if a primitive is missing, install it with `npx shadcn add <name>` rather than recreating it
- **Dark mode is the default** — `<html className="dark">` is set in `src/app/layout.tsx`; do not add a light-mode toggle without confirming first
- **Imports use the `@/*` alias** — e.g., `import { Button } from "@/components/ui/button"`
- **Tailwind v4** — theme tokens live in `src/app/globals.css` via `@theme inline`; do not add a `tailwind.config.js`
- **Database access** — always go through `getDb()` in `@/lib/db`; never instantiate `neon()` or a Drizzle client elsewhere. Routes that hit the DB must `export const runtime = "nodejs"` (the Neon HTTP driver works on edge too, but Node is the default). Use `isDbConfigured()` to gracefully degrade when `DATABASE_URL` is missing — avoid 500s on deployments without it
- **Schema changes** — edit `src/lib/db/schema.ts`, run `npm run db:generate` to produce a migration in `drizzle/`, commit both, then run `npm run db:migrate` against the target DB. Never edit an already-applied migration file in place
- **Auth (Clerk v7)** — server components use `auth()` or `currentUser()` from `@clerk/nextjs/server`; client components use `useAuth()` / `useUser()` / `<UserButton>` from `@clerk/nextjs`. Conditional rendering uses `<Show when="signed-in" />` / `<Show when="signed-out" />` (the legacy `<SignedIn>` / `<SignedOut>` were removed in v7). Add new protected routes by appending to `createRouteMatcher` in `src/middleware.ts`
- **User-row access** — anywhere on the server, prefer `getOrCreateUser(clerkId)` from `@/lib/db/users` over a raw `select` on `users`. It's the safety net for missed Clerk webhooks. Don't insert directly into the `users` table from arbitrary code paths — only the webhook handler and `getOrCreateUser` should write there
- **Public API endpoints** — every `/api/v1/*` handler must (1) call `authenticateApiKey(req)` first, (2) call `checkRateLimit(user)` next, (3) log every outcome (200, 4xx, 5xx) to `api_usage` via `after(() => logUsage(...))`. The rate limiter is Postgres-backed (counts rows in `api_usage`); swap to Upstash by editing `checkRateLimit` if abuse warrants it. Plan limits live in `@/lib/api/plans`, not inline. Free tier has `monthlyApiRequests: 0` — calls return 403 plan_required
- **Billing (Stripe)** — `plan_tier` is owned by the Stripe webhook. Don't write to it from anywhere except `/api/webhooks/stripe/route.ts` (and `getOrCreateUser`'s initial insert with default `'free'`). Plan↔price-ID mapping is two functions in `@/lib/api/plans`: `getStripePriceId(planId)` and `getPlanByPriceId(priceId)`. When adding new tiers, update both `PLAN_TIERS` and these helpers, plus add the matching `STRIPE_PRICE_*` env var

## Working with this project

**Always read this file first** at the start of a new session before making changes. It captures context that isn't obvious from the code:

- which auth/db/payments services are wired up (Clerk / Neon / Stripe — even if not yet integrated)
- the dark-mode-default and server-components-default conventions
- where to add new code vs. regenerate it (e.g., `src/components/ui/` is regenerated)

When the user describes a task, check this file's conventions before suggesting an approach. If a convention here conflicts with the user's instruction, surface the conflict instead of silently overriding the convention.

## Pre-launch checklist

**The user explicitly asked to be reminded of these right before launch.** If they say "I'm getting close to launching" / "we're going live soon" / "shipping this week" or similar, walk them through this list before they ship.

- [ ] **Clerk: switch to a production instance.** Currently using development keys (`pk_test_…` / `sk_test_…`).
  1. Clerk dashboard → top-left dropdown → **Create production instance** for the same app
  2. Configure the production domain (DNS records — Clerk shows them)
  3. Grab `pk_live_…` / `sk_live_…` from the production instance's API Keys page
  4. In Vercel → Settings → Environment Variables → set the **Production** override of `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to the live keys (leave Preview/Development on test keys to keep PR previews out of the real user list)
  5. Redeploy production
- [ ] **Neon: separate production database.** Currently one DB across all environments. Either create a Neon branch for prod and point Vercel's Production env at its connection string, or accept the shared-DB risk knowingly.
- [ ] **`NEXT_PUBLIC_SITE_URL`**: set in Vercel Production to the real domain. Falls back to `mcpkit.vercel.app` (which is already taken by another project — see "Live deployment" below). Affects `metadataBase`, OG image footer, sitemap, robots.txt host.
- [ ] **Custom domain**: add in Vercel → Settings → Domains, configure DNS, update `NEXT_PUBLIC_SITE_URL` and any hardcoded URLs to match.
- [ ] **Clerk webhook (first-time setup)**: no webhook is configured yet. Local dev intentionally relies on `getOrCreateUser()` lazy-creating rows on first dashboard visit (no ngrok tunnel needed). Before launch, in Clerk dashboard → Webhooks, create an endpoint pointing at `https://<prod-domain>/api/webhooks/clerk`, subscribe to `user.created` / `user.updated` / `user.deleted`, copy the signing secret, set it as `CLERK_WEBHOOK_SECRET` in Vercel (Production at minimum; Preview optional). When you flip to a production Clerk instance (separate item above), the webhook is created on that instance — different signing secret, set per-environment.
- [ ] **Stripe production swap**: switch from test-mode keys to live-mode keys.
  1. https://dashboard.stripe.com → toggle to live mode (top right) → API keys → copy `pk_live_…` and `sk_live_…`
  2. Recreate the two products in live mode (or use Stripe's Test → Live copy tool). Capture the new `price_…` IDs.
  3. Create a new webhook endpoint in live mode pointing at the production URL; copy its signing secret (different from test).
  4. In Vercel → Production env: replace `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM` with the live values. Leave Preview/Development on test keys.
  5. Redeploy production. Smoke-test with a real card on a separate burner Clerk account, then refund yourself in the Stripe dashboard.
- [ ] **Footer placeholders**: `/docs`, `/status`, the Twitter URL, and the GitHub link in `src/app/page.tsx` `FOOTER_LINKS` either need real destinations or removal.
- [ ] **Rate-limit `/api/share`**: anonymous public POST endpoint with no rate limit. Add `@upstash/ratelimit` + Upstash Redis (or similar) before opening to traffic.
- [ ] **Robots / SEO**: confirm `robots.ts` allows everything except `/api/`. Verify `og-image.png` exists at the public root (currently referenced from `metadata.openGraph` but not yet created — generate one or remove the reference).
- [ ] **Vercel deployment protection**: per-deploy URLs are protected; production alias is public. Verify in Settings → Deployment Protection that this is still the desired setup.

## Live deployment notes

- Stable production URL: `https://mcpkit-bmillion145s-projects.vercel.app`
- The clean alias `mcpkit.vercel.app` is taken by another Vercel project — a custom domain is the cleanest fix.
- Per-deploy URLs (e.g., `mcpkit-<hash>-bmillion145s-projects.vercel.app`) require Vercel SSO to access. Don't share these as public links.
