CREATE TABLE IF NOT EXISTS "shared_configs" (
  "id" text PRIMARY KEY NOT NULL,
  "config" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "view_count" integer DEFAULT 0 NOT NULL,
  "last_viewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_configs_created_at_idx"
  ON "shared_configs" USING btree ("created_at");
