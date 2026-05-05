import "server-only"
import { createHash } from "node:crypto"
import { and, eq, gte, sql } from "drizzle-orm"
import { getDb, schema } from "@/lib/db"
import type { ApiKey, User } from "@/lib/db/schema"
import { getPlan } from "@/lib/api/plans"

// ──────────────────── Types ────────────────────

export interface AuthOk {
  ok: true
  user: User
  apiKey: ApiKey
}

export interface AuthFail {
  ok: false
  response: Response
}

export type AuthResult = AuthOk | AuthFail

export interface RateLimitOk {
  ok: true
  /** Requests already used this calendar month, before this one. */
  used: number
  /** Plan ceiling for this calendar month. */
  limit: number
}

export type RateLimitResult = RateLimitOk | AuthFail

// ──────────────────── Auth ────────────────────

/**
 * Verify an `Authorization: Bearer <api_key>` header against the api_keys
 * table. Returns the matching `user` and `apiKey` rows, or a ready-to-return
 * `Response` if anything is wrong.
 *
 * Errors:
 *   401 missing_api_key   — no/malformed Authorization header
 *   401 invalid_api_key   — no row matches the hash
 *   401 revoked_api_key   — key was revoked
 *   503 db_unavailable    — DATABASE_URL not configured
 */
export async function authenticateApiKey(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "missing_api_key",
        "Authorization header must be in the form 'Bearer <api_key>'.",
      ),
    }
  }
  const token = authHeader.slice("Bearer ".length).trim()
  if (!token) {
    return {
      ok: false,
      response: errorResponse(401, "missing_api_key", "Empty bearer token."),
    }
  }

  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      response: errorResponse(
        503,
        "db_unavailable",
        "API authentication is not configured on this deployment.",
      ),
    }
  }

  const hash = createHash("sha256").update(token).digest("hex")
  const db = getDb()

  const rows = await db
    .select({
      apiKey: schema.apiKeys,
      user: schema.users,
    })
    .from(schema.apiKeys)
    .innerJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
    .where(eq(schema.apiKeys.keyHash, hash))
    .limit(1)

  if (rows.length === 0) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "invalid_api_key",
        "API key is not recognized.",
      ),
    }
  }

  const { apiKey, user } = rows[0]
  if (apiKey.revokedAt !== null) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "revoked_api_key",
        "API key has been revoked.",
      ),
    }
  }

  return { ok: true, user, apiKey }
}

// ──────────────────── Rate limiting ────────────────────

/**
 * Postgres-backed monthly rate limiter. Counts rows in `api_usage` for this
 * user since the start of the current calendar month (UTC), and compares to
 * the plan's `monthlyApiRequests` ceiling.
 *
 * - Free tier (limit 0) → 403 plan_required.
 * - Over limit → 429 rate_limited with X-RateLimit-* headers.
 * - The check is non-atomic: two concurrent requests at the boundary may
 *   both pass before either is logged. Acceptable overrun for monthly
 *   billing-style limits; if abuse becomes a concern, swap in Upstash
 *   `@upstash/ratelimit` here without changing callers.
 */
export async function checkRateLimit(user: User): Promise<RateLimitResult> {
  const plan = getPlan(user.planTier)

  if (plan.monthlyApiRequests === 0) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "plan_required",
        `Your current plan (${plan.name}) does not include API access. Upgrade at /pricing.`,
        { "X-Plan": plan.id },
      ),
    }
  }

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const db = getDb()
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.apiUsage)
    .innerJoin(
      schema.apiKeys,
      eq(schema.apiUsage.apiKeyId, schema.apiKeys.id),
    )
    .where(
      and(
        eq(schema.apiKeys.userId, user.id),
        gte(schema.apiUsage.createdAt, monthStart),
      ),
    )

  const used = result[0]?.count ?? 0

  if (used >= plan.monthlyApiRequests) {
    return {
      ok: false,
      response: errorResponse(
        429,
        "rate_limited",
        `Monthly limit of ${plan.monthlyApiRequests.toLocaleString()} requests reached. Resets at the start of next UTC month.`,
        rateLimitHeaders(plan.monthlyApiRequests, 0),
      ),
    }
  }

  return { ok: true, used, limit: plan.monthlyApiRequests }
}

/** HTTP headers describing the current rate-limit window. */
export function rateLimitHeaders(
  limit: number,
  remaining: number,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": nextMonthIso(),
  }
}

// ──────────────────── Usage logging ────────────────────

/**
 * Insert a row into `api_usage` describing the request that just happened,
 * plus bump `api_keys.last_used_at`. Designed to be called from `after()` so
 * it doesn't add to user-facing latency.
 *
 * Failures are logged and swallowed — a logging error must never affect the
 * user-facing response.
 */
export async function logUsage(
  apiKeyId: string,
  endpoint: string,
  statusCode: number,
  ms: number,
): Promise<void> {
  if (!process.env.DATABASE_URL) return
  const db = getDb()
  try {
    await Promise.all([
      db.insert(schema.apiUsage).values({
        apiKeyId,
        endpoint,
        statusCode,
        ms,
      }),
      db
        .update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, apiKeyId)),
    ])
  } catch (err) {
    console.error("logUsage failed", err)
  }
}

// ──────────────────── Helpers ────────────────────

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  })
}

function nextMonthIso(): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}
