import { preprocess } from "./preprocessing"

export type Severity = "error" | "warning" | "info"

export interface ValidationIssue {
  severity: Severity
  code: string
  message: string
  path: string
  suggestion?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  info: ValidationIssue[]
  durationMs: number
  format: "json" | "yaml" | "object"
  normalizedJson?: string
}

export type ValidatorInput = string | Record<string, unknown> | unknown[] | unknown

const SERVER_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/
const TOOL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/
const ENV_KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/
const VALID_TRANSPORTS = ["stdio", "sse", "http", "streamable-http"] as const
const JSON_SCHEMA_TYPES = [
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null",
] as const

interface Ctx {
  issues: ValidationIssue[]
}

function createCtx(): Ctx {
  return { issues: [] }
}

function now(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now()
  }
  return Date.now()
}

function pushIssue(
  ctx: Ctx,
  severity: Severity,
  code: string,
  message: string,
  path: string,
  suggestion?: string,
) {
  ctx.issues.push({ severity, code, message, path, suggestion })
}

function escapePointer(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1")
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function finalize(
  ctx: Ctx,
  meta: {
    durationMs: number
    format: "json" | "yaml" | "object"
    normalizedJson?: string
  },
): ValidationResult {
  const errors = ctx.issues.filter((i) => i.severity === "error")
  const warnings = ctx.issues.filter((i) => i.severity === "warning")
  const info = ctx.issues.filter((i) => i.severity === "info")
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    durationMs: meta.durationMs,
    format: meta.format,
    normalizedJson: meta.normalizedJson,
  }
}

export function validateMcp(input: ValidatorInput): ValidationResult {
  const ctx = createCtx()
  const start = now()
  let format: "json" | "yaml" | "object" = "object"
  let normalizedJson: string | undefined

  let parsed: unknown
  if (typeof input === "string") {
    if (input.trim().length === 0) {
      pushIssue(
        ctx,
        "error",
        "EMPTY_INPUT",
        "Input is empty",
        "",
        "Paste a config or click Load example.",
      )
      return finalize(ctx, { durationMs: now() - start, format: "json" })
    }

    const pre = preprocess(input)
    format = pre.format
    normalizedJson = pre.normalizedJson
    for (const note of pre.notes) {
      pushIssue(ctx, note.severity, note.code, note.message, "")
    }

    try {
      parsed = JSON.parse(pre.cleaned)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON"
      pushIssue(
        ctx,
        "error",
        "INVALID_JSON",
        msg,
        "",
        "Check trailing commas, smart quotes, or use the Format JSON button.",
      )
      return finalize(ctx, {
        durationMs: now() - start,
        format,
        normalizedJson,
      })
    }
  } else {
    parsed = input
  }

  if (!isPlainObject(parsed)) {
    pushIssue(
      ctx,
      "error",
      "INVALID_ROOT",
      "Top-level value must be a JSON object",
      "",
      "Wrap the document in { }.",
    )
    return finalize(ctx, { durationMs: now() - start, format, normalizedJson })
  }

  const root = parsed
  const hasServers = "mcpServers" in root
  const hasTools = "tools" in root
  const looksLikeTool =
    "name" in root && ("inputSchema" in root || "description" in root)

  if (hasServers) {
    validateClientConfig(root, ctx)
  } else if (hasTools) {
    validateToolList(root.tools, "/tools", ctx)
  } else if (looksLikeTool) {
    validateTool(root, "", ctx)
  } else {
    pushIssue(
      ctx,
      "error",
      "UNKNOWN_DOCUMENT",
      "Could not detect document type",
      "",
      "Expected 'mcpServers' (client config) or 'tools' (tool list) at the top level.",
    )
  }

  return finalize(ctx, { durationMs: now() - start, format, normalizedJson })
}

function validateClientConfig(root: Record<string, unknown>, ctx: Ctx) {
  const servers = root.mcpServers
  if (!isPlainObject(servers)) {
    pushIssue(
      ctx,
      "error",
      "INVALID_MCP_SERVERS",
      "'mcpServers' must be an object keyed by server name",
      "/mcpServers",
      "Use the shape { mcpServers: { name: { ... } } }.",
    )
    return
  }

  const entries = Object.entries(servers)
  if (entries.length === 0) {
    pushIssue(
      ctx,
      "warning",
      "EMPTY_SERVERS",
      "'mcpServers' has no entries",
      "/mcpServers",
      "Add at least one server.",
    )
  }

  for (const [name, raw] of entries) {
    const path = `/mcpServers/${escapePointer(name)}`

    if (!SERVER_NAME_PATTERN.test(name)) {
      pushIssue(
        ctx,
        "warning",
        "SERVER_NAME_CONVENTION",
        `Server name '${name}' should match [a-zA-Z][a-zA-Z0-9_-]*`,
        path,
        "Use lowercase letters, digits, underscores, or hyphens — start with a letter.",
      )
    }

    validateServer(raw, name, path, ctx)
  }
}

function validateServer(
  raw: unknown,
  name: string,
  path: string,
  ctx: Ctx,
) {
  if (!isPlainObject(raw)) {
    pushIssue(
      ctx,
      "error",
      "INVALID_SERVER",
      `Server '${name}' must be an object`,
      path,
    )
    return
  }
  const server = raw

  if (server.type !== undefined) {
    if (typeof server.type !== "string") {
      pushIssue(
        ctx,
        "error",
        "INVALID_SERVER_TYPE",
        `Server '${name}': 'type' must be a string`,
        `${path}/type`,
      )
    } else if (
      !(VALID_TRANSPORTS as readonly string[]).includes(server.type)
    ) {
      pushIssue(
        ctx,
        "error",
        "UNKNOWN_TRANSPORT",
        `Server '${name}': transport '${server.type}' is not recognized`,
        `${path}/type`,
        `Use one of: ${VALID_TRANSPORTS.join(", ")}.`,
      )
    }
  }

  const hasCommand = typeof server.command === "string"
  const hasUrl = typeof server.url === "string"

  if (!hasCommand && !hasUrl) {
    pushIssue(
      ctx,
      "error",
      "MISSING_TRANSPORT",
      `Server '${name}' must define 'command' (stdio) or 'url' (sse/http)`,
      path,
      "Add a 'command' string for local servers or a 'url' string for remote ones.",
    )
    return
  }

  if (hasCommand && hasUrl) {
    pushIssue(
      ctx,
      "warning",
      "AMBIGUOUS_TRANSPORT",
      `Server '${name}' defines both 'command' and 'url'`,
      path,
      "Pick one transport — clients may pick the wrong one.",
    )
  }

  if (hasCommand) {
    validateStdioServer(server, name, path, ctx)
  }
  if (hasUrl) {
    validateRemoteServer(server, name, path, ctx)
  }

  if (server.env !== undefined) {
    validateEnv(server, name, path, ctx)
  }

  if (server.disabled !== undefined && typeof server.disabled !== "boolean") {
    pushIssue(
      ctx,
      "error",
      "INVALID_DISABLED",
      `Server '${name}': 'disabled' must be a boolean`,
      `${path}/disabled`,
    )
  }
}

function validateStdioServer(
  server: Record<string, unknown>,
  name: string,
  path: string,
  ctx: Ctx,
) {
  const command = server.command as string
  if (command.trim().length === 0) {
    pushIssue(
      ctx,
      "error",
      "EMPTY_COMMAND",
      `Server '${name}': 'command' is empty`,
      `${path}/command`,
    )
  }

  if (server.args !== undefined) {
    if (!Array.isArray(server.args)) {
      pushIssue(
        ctx,
        "error",
        "INVALID_ARGS",
        `Server '${name}': 'args' must be an array of strings`,
        `${path}/args`,
      )
    } else {
      server.args.forEach((arg, i) => {
        if (typeof arg !== "string") {
          pushIssue(
            ctx,
            "error",
            "INVALID_ARG",
            `Server '${name}': args[${i}] must be a string`,
            `${path}/args/${i}`,
          )
        }
      })
    }
  }
}

function validateRemoteServer(
  server: Record<string, unknown>,
  name: string,
  path: string,
  ctx: Ctx,
) {
  const url = server.url as string
  let parsed: URL | null = null
  try {
    parsed = new URL(url)
  } catch {
    pushIssue(
      ctx,
      "error",
      "INVALID_URL",
      `Server '${name}': 'url' is not a valid URL`,
      `${path}/url`,
      "Include the scheme, e.g. https://example.com/mcp.",
    )
    return
  }

  if (parsed.protocol === "http:") {
    pushIssue(
      ctx,
      "warning",
      "INSECURE_URL",
      `Server '${name}': uses http:// — credentials and traffic are unencrypted`,
      `${path}/url`,
      "Prefer https:// for remote MCP servers.",
    )
  } else if (parsed.protocol !== "https:") {
    pushIssue(
      ctx,
      "error",
      "UNSUPPORTED_URL_SCHEME",
      `Server '${name}': '${parsed.protocol}' is not a supported scheme`,
      `${path}/url`,
      "Use https:// (or http:// for local development).",
    )
  }

  if (server.command !== undefined) {
    pushIssue(
      ctx,
      "warning",
      "REMOTE_HAS_COMMAND",
      `Server '${name}': remote server has a 'command' field — it will be ignored`,
      `${path}/command`,
    )
  }
}

function validateEnv(
  server: Record<string, unknown>,
  name: string,
  path: string,
  ctx: Ctx,
) {
  const env = server.env
  if (!isPlainObject(env)) {
    pushIssue(
      ctx,
      "error",
      "INVALID_ENV",
      `Server '${name}': 'env' must be an object`,
      `${path}/env`,
    )
    return
  }

  const envKeys = new Set(Object.keys(env))

  for (const [key, value] of Object.entries(env)) {
    const keyPath = `${path}/env/${escapePointer(key)}`
    if (typeof value !== "string") {
      pushIssue(
        ctx,
        "error",
        "INVALID_ENV_VALUE",
        `Server '${name}': env.${key} must be a string`,
        keyPath,
      )
    }
    if (!ENV_KEY_PATTERN.test(key)) {
      pushIssue(
        ctx,
        "info",
        "ENV_KEY_CONVENTION",
        `Server '${name}': env var '${key}' is not UPPER_SNAKE_CASE`,
        keyPath,
        `Rename to ${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}.`,
      )
    }
  }

  if (Array.isArray(server.args)) {
    server.args.forEach((arg, i) => {
      if (typeof arg !== "string") return
      const refs = arg.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g)
      for (const m of refs) {
        const ref = m[1]
        if (!envKeys.has(ref)) {
          pushIssue(
            ctx,
            "warning",
            "UNDECLARED_ENV_REF",
            `Server '${name}': args[${i}] references \${${ref}} but it isn't declared in env`,
            `${path}/args/${i}`,
            `Add '${ref}' to the env object.`,
          )
        }
      }
    })
  }
}

function validateToolList(value: unknown, path: string, ctx: Ctx) {
  if (!Array.isArray(value)) {
    pushIssue(
      ctx,
      "error",
      "INVALID_TOOLS",
      "'tools' must be an array",
      path,
    )
    return
  }
  if (value.length === 0) {
    pushIssue(ctx, "warning", "EMPTY_TOOLS", "'tools' is empty", path)
  }
  const seen = new Set<string>()
  value.forEach((tool, i) => {
    const toolPath = `${path}/${i}`
    validateTool(tool, toolPath, ctx)
    if (isPlainObject(tool) && typeof tool.name === "string") {
      if (seen.has(tool.name)) {
        pushIssue(
          ctx,
          "error",
          "DUPLICATE_TOOL",
          `Duplicate tool name: '${tool.name}'`,
          `${toolPath}/name`,
        )
      }
      seen.add(tool.name)
    }
  })
}

function validateTool(value: unknown, path: string, ctx: Ctx) {
  if (!isPlainObject(value)) {
    pushIssue(ctx, "error", "INVALID_TOOL", "Tool must be an object", path)
    return
  }
  const tool = value

  if (typeof tool.name !== "string") {
    pushIssue(
      ctx,
      "error",
      "TOOL_MISSING_NAME",
      "Tool is missing required 'name' (string)",
      `${path}/name`,
    )
  } else if (!TOOL_NAME_PATTERN.test(tool.name)) {
    pushIssue(
      ctx,
      "warning",
      "TOOL_NAME_CONVENTION",
      `Tool name '${tool.name}' should match [a-zA-Z][a-zA-Z0-9_]*`,
      `${path}/name`,
      "Use snake_case identifiers — hosts may reject hyphens.",
    )
  }

  if (tool.description === undefined) {
    pushIssue(
      ctx,
      "warning",
      "TOOL_MISSING_DESCRIPTION",
      "Tool has no 'description' — clients use it to decide when to call this tool",
      `${path}/description`,
      "Add a one-sentence description.",
    )
  } else if (typeof tool.description !== "string") {
    pushIssue(
      ctx,
      "error",
      "INVALID_TOOL_DESCRIPTION",
      "'description' must be a string",
      `${path}/description`,
    )
  }

  if (tool.inputSchema === undefined) {
    pushIssue(
      ctx,
      "error",
      "TOOL_MISSING_INPUT_SCHEMA",
      "Tool is missing required 'inputSchema'",
      `${path}/inputSchema`,
      "Add an inputSchema object even if the tool takes no arguments: { type: 'object', properties: {} }.",
    )
  } else {
    validateInputSchema(tool.inputSchema, `${path}/inputSchema`, ctx)
  }
}

function validateInputSchema(value: unknown, path: string, ctx: Ctx) {
  if (!isPlainObject(value)) {
    pushIssue(
      ctx,
      "error",
      "INVALID_INPUT_SCHEMA",
      "inputSchema must be an object",
      path,
    )
    return
  }
  const schema = value

  if (schema.type !== undefined) {
    if (
      typeof schema.type !== "string" ||
      !(JSON_SCHEMA_TYPES as readonly string[]).includes(schema.type)
    ) {
      pushIssue(
        ctx,
        "error",
        "INVALID_SCHEMA_TYPE",
        `inputSchema.type '${String(schema.type)}' is not a valid JSON Schema type`,
        `${path}/type`,
        `Use one of: ${JSON_SCHEMA_TYPES.join(", ")}.`,
      )
    }
  } else {
    pushIssue(
      ctx,
      "warning",
      "SCHEMA_MISSING_TYPE",
      "inputSchema has no 'type' field",
      path,
      "Set type: 'object' for tool input schemas.",
    )
  }

  if (schema.type !== "object" && schema.type !== undefined) {
    pushIssue(
      ctx,
      "warning",
      "NON_OBJECT_INPUT_SCHEMA",
      `inputSchema.type is '${schema.type}' — MCP tool inputs are normally objects`,
      `${path}/type`,
      "Use type: 'object' with properties.",
    )
  }

  if (schema.properties !== undefined) {
    if (!isPlainObject(schema.properties)) {
      pushIssue(
        ctx,
        "error",
        "INVALID_PROPERTIES",
        "inputSchema.properties must be an object",
        `${path}/properties`,
      )
    } else {
      for (const [propName, propValue] of Object.entries(schema.properties)) {
        const propPath = `${path}/properties/${escapePointer(propName)}`
        if (!isPlainObject(propValue)) {
          pushIssue(
            ctx,
            "error",
            "INVALID_PROPERTY",
            `Property '${propName}' must be a JSON Schema object`,
            propPath,
          )
        }
      }
    }
  }

  if (schema.required !== undefined) {
    if (!Array.isArray(schema.required)) {
      pushIssue(
        ctx,
        "error",
        "INVALID_REQUIRED",
        "inputSchema.required must be an array of strings",
        `${path}/required`,
      )
    } else {
      const props = isPlainObject(schema.properties) ? schema.properties : {}
      schema.required.forEach((r, i) => {
        if (typeof r !== "string") {
          pushIssue(
            ctx,
            "error",
            "INVALID_REQUIRED_ITEM",
            `required[${i}] must be a string`,
            `${path}/required/${i}`,
          )
          return
        }
        if (!(r in props)) {
          pushIssue(
            ctx,
            "warning",
            "REQUIRED_NOT_IN_PROPERTIES",
            `'${r}' is in 'required' but not declared in 'properties'`,
            `${path}/required/${i}`,
            `Add '${r}' to properties or remove it from required.`,
          )
        }
      })
    }
  }
}
