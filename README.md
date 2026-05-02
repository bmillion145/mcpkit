# MCPKit

Free MCP server validator and config tools, with a paid API tier.

MCPKit helps developers working with the Model Context Protocol (MCP) validate their server implementations, generate and inspect configs, and ship integrations with confidence. The web app is free; a paid API tier is available for programmatic access.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (dark mode default)
- Clerk for auth
- Neon Postgres for storage
- Stripe for billing

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — lint with ESLint

## Project structure

- `src/app/` — App Router routes and layouts
- `src/components/ui/` — shadcn/ui primitives
- `src/components/` — application components
- `src/lib/` — shared utilities
- `src/app/api/` — API route handlers

## License

TBD.
