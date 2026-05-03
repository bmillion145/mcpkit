import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon connection string to .env.local",
    )
  }
  const client = neon(url)
  cached = drizzle({ client, schema })
  return cached
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export { schema }
