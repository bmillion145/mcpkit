import { config } from "dotenv"
config({ path: ".env" })
config({ path: ".env.local", override: true })

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { migrate } from "drizzle-orm/neon-http/migrator"

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    "DATABASE_URL is not set. Add it to .env.local before running migrations.",
  )
  process.exit(1)
}

async function main() {
  const client = neon(url!)
  const db = drizzle({ client })
  console.log("Running migrations against:", url!.replace(/:[^:@/]+@/, ":****@"))
  await migrate(db, { migrationsFolder: "./drizzle" })
  console.log("Migrations complete.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
