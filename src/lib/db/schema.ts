import { sql } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core"

export const sharedConfigs = pgTable(
  "shared_configs",
  {
    id: text("id").primaryKey(),
    config: text("config").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  },
  (table) => [index("shared_configs_created_at_idx").on(table.createdAt)],
)

export type SharedConfig = typeof sharedConfigs.$inferSelect
export type NewSharedConfig = typeof sharedConfigs.$inferInsert
