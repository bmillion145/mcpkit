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

## Working with this project

**Always read this file first** at the start of a new session before making changes. It captures context that isn't obvious from the code:

- which auth/db/payments services are wired up (Clerk / Neon / Stripe — even if not yet integrated)
- the dark-mode-default and server-components-default conventions
- where to add new code vs. regenerate it (e.g., `src/components/ui/` is regenerated)

When the user describes a task, check this file's conventions before suggesting an approach. If a convention here conflicts with the user's instruction, surface the conflict instead of silently overriding the convention.
