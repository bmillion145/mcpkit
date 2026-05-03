import { config } from "dotenv"
config({ path: ".env" })
config({ path: ".env.local", override: true })

import type { Config } from "drizzle-kit"

const url = process.env.DATABASE_URL

if (!url && process.env.NODE_ENV !== "production") {
  // Allow drizzle-kit generate (which doesn't touch the DB) without DATABASE_URL.
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: url ?? "postgres://placeholder@localhost/placeholder",
  },
  strict: true,
  verbose: true,
} satisfies Config
