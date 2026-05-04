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
- [ ] **Stripe** (when added): same pattern — test mode → live mode keys, swap webhook signing secret, point Stripe webhooks at the production URL.
- [ ] **Footer placeholders**: `/docs`, `/status`, the Twitter URL, and the GitHub link in `src/app/page.tsx` `FOOTER_LINKS` either need real destinations or removal.
- [ ] **Rate-limit `/api/share`**: anonymous public POST endpoint with no rate limit. Add `@upstash/ratelimit` + Upstash Redis (or similar) before opening to traffic.
- [ ] **Robots / SEO**: confirm `robots.ts` allows everything except `/api/`. Verify `og-image.png` exists at the public root (currently referenced from `metadata.openGraph` but not yet created — generate one or remove the reference).
- [ ] **Vercel deployment protection**: per-deploy URLs are protected; production alias is public. Verify in Settings → Deployment Protection that this is still the desired setup.

## Live deployment notes

- Stable production URL: `https://mcpkit-bmillion145s-projects.vercel.app`
- The clean alias `mcpkit.vercel.app` is taken by another Vercel project — a custom domain is the cleanest fix.
- Per-deploy URLs (e.g., `mcpkit-<hash>-bmillion145s-projects.vercel.app`) require Vercel SSO to access. Don't share these as public links.
