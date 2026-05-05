import { after, NextResponse } from "next/server"
import {
  authenticateApiKey,
  checkRateLimit,
  errorResponse,
  logUsage,
  rateLimitHeaders,
} from "@/lib/api/auth"
import { validateMcp } from "@/lib/mcp-validator"

export const runtime = "nodejs"

const ENDPOINT = "/api/v1/validate"
const MAX_BYTES = 256 * 1024

export async function POST(req: Request) {
  const start = performance.now()
  const ms = () => Math.round(performance.now() - start)

  // 1. Authenticate. On failure we return early; nothing to log because we
  //    don't know which key the request would have been billed to.
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return auth.response

  // 2. Rate limit. From here on, we have an apiKey id and log every outcome.
  const rate = await checkRateLimit(auth.user)
  if (!rate.ok) {
    after(() => logUsage(auth.apiKey.id, ENDPOINT, 429, ms()))
    return rate.response
  }

  // 3. Parse body. Cap at 256 KB to mirror the share API.
  const contentLength = Number(req.headers.get("content-length") ?? "0")
  if (contentLength > MAX_BYTES) {
    after(() => logUsage(auth.apiKey.id, ENDPOINT, 413, ms()))
    return errorResponse(
      413,
      "payload_too_large",
      `Request body exceeds ${MAX_BYTES} bytes.`,
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    after(() => logUsage(auth.apiKey.id, ENDPOINT, 400, ms()))
    return errorResponse(
      400,
      "invalid_json_body",
      "Request body must be valid JSON.",
    )
  }

  if (!isObject(body) || !("config" in body)) {
    after(() => logUsage(auth.apiKey.id, ENDPOINT, 400, ms()))
    return errorResponse(
      400,
      "missing_config",
      "Body must include a 'config' field (string or object).",
    )
  }

  const config = (body as { config: unknown }).config
  if (typeof config !== "string" && !isObject(config) && !Array.isArray(config)) {
    after(() => logUsage(auth.apiKey.id, ENDPOINT, 400, ms()))
    return errorResponse(
      400,
      "invalid_config",
      "'config' must be a JSON string or object.",
    )
  }

  // 4. Validate. Validator failures of the *config* are not API errors —
  //    they're returned with 200 alongside the result.
  let result
  try {
    result = validateMcp(config as string | Record<string, unknown> | unknown[])
  } catch (err) {
    console.error("validateMcp threw", err)
    after(() => logUsage(auth.apiKey.id, ENDPOINT, 500, ms()))
    return errorResponse(
      500,
      "internal_error",
      "Validation engine raised an unexpected error.",
    )
  }

  const durationMs = ms()
  after(() => logUsage(auth.apiKey.id, ENDPOINT, 200, durationMs))

  return NextResponse.json(
    {
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      info: result.info,
      durationMs: result.durationMs,
      format: result.format,
      ...(result.normalizedJson
        ? { normalizedJson: result.normalizedJson }
        : {}),
    },
    {
      status: 200,
      headers: rateLimitHeaders(rate.limit, rate.limit - rate.used - 1),
    },
  )
}

export function GET() {
  return errorResponse(
    405,
    "method_not_allowed",
    "Use POST with a JSON body { config: string | object }.",
  )
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}
