// Visual MCP tool input-schema builder.
//
// Tree model (discriminated union by `kind`) + immutable update helpers +
// JSON Schema serializer + small sample-data validator + preset templates.
// No React deps — safe to import anywhere.

export type Kind =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "enum"

export interface BaseNode {
  id: string
  description?: string
}

export interface StringNode extends BaseNode {
  kind: "string"
  format?: StringFormat
  pattern?: string
  minLength?: number | null
  maxLength?: number | null
  default?: string
}

export type StringFormat =
  | ""
  | "email"
  | "uri"
  | "date"
  | "date-time"
  | "uuid"
  | "ipv4"

export interface NumberNode extends BaseNode {
  kind: "number"
  integer: boolean
  minimum?: number | null
  maximum?: number | null
  multipleOf?: number | null
  default?: number | null
}

export interface BooleanNode extends BaseNode {
  kind: "boolean"
  default?: boolean | null
}

export interface ArrayNode extends BaseNode {
  kind: "array"
  items: SchemaNode | null
  minItems?: number | null
  maxItems?: number | null
}

export interface PropertyEntry {
  name: string
  required: boolean
  schema: SchemaNode
}

export interface ObjectNode extends BaseNode {
  kind: "object"
  properties: PropertyEntry[]
  additionalProperties?: boolean
}

export interface EnumNode extends BaseNode {
  kind: "enum"
  values: string[]
  default?: string
}

export type SchemaNode =
  | StringNode
  | NumberNode
  | BooleanNode
  | ArrayNode
  | ObjectNode
  | EnumNode

export interface ToolWrapper {
  enabled: boolean
  name: string
  description: string
}

let idSeq = 0
export function newId(): string {
  return `n${++idSeq}`
}

export function newNode(kind: Kind): SchemaNode {
  switch (kind) {
    case "string":
      return { id: newId(), kind: "string", format: "" }
    case "number":
      return { id: newId(), kind: "number", integer: false }
    case "boolean":
      return { id: newId(), kind: "boolean" }
    case "array":
      return { id: newId(), kind: "array", items: null }
    case "object":
      return { id: newId(), kind: "object", properties: [] }
    case "enum":
      return { id: newId(), kind: "enum", values: ["option-1", "option-2"] }
  }
}

export function defaultRoot(): ObjectNode {
  return { id: newId(), kind: "object", properties: [] }
}

// ────────────── Tree traversal & immutable updates ──────────────

export function findNode(root: SchemaNode, id: string): SchemaNode | null {
  if (root.id === id) return root
  switch (root.kind) {
    case "object":
      for (const p of root.properties) {
        const found = findNode(p.schema, id)
        if (found) return found
      }
      return null
    case "array":
      return root.items ? findNode(root.items, id) : null
    default:
      return null
  }
}

export function findParent(
  root: SchemaNode,
  id: string,
): SchemaNode | null {
  switch (root.kind) {
    case "object":
      for (const p of root.properties) {
        if (p.schema.id === id) return root
        const f = findParent(p.schema, id)
        if (f) return f
      }
      return null
    case "array":
      if (root.items?.id === id) return root
      return root.items ? findParent(root.items, id) : null
    default:
      return null
  }
}

export function updateNode(
  root: SchemaNode,
  id: string,
  updater: (n: SchemaNode) => SchemaNode,
): SchemaNode {
  if (root.id === id) return updater(root)
  switch (root.kind) {
    case "object":
      return {
        ...root,
        properties: root.properties.map((p) => ({
          ...p,
          schema: updateNode(p.schema, id, updater),
        })),
      }
    case "array":
      return {
        ...root,
        items: root.items ? updateNode(root.items, id, updater) : null,
      }
    default:
      return root
  }
}

export function replaceNodeKind(
  root: SchemaNode,
  id: string,
  newKind: Kind,
): SchemaNode {
  return updateNode(root, id, (n) => {
    const fresh = newNode(newKind)
    return {
      ...fresh,
      id: n.id,
      description: n.description,
    } as SchemaNode
  })
}

export function addProperty(
  root: SchemaNode,
  objectId: string,
  kind: Kind,
): { root: SchemaNode; newId: string; name: string } {
  const child = newNode(kind)
  let name = "newProperty"
  let updated = root
  updated = updateNode(updated, objectId, (n) => {
    if (n.kind !== "object") return n
    const existing = new Set(n.properties.map((p) => p.name))
    let candidate = name
    let i = 2
    while (existing.has(candidate)) {
      candidate = `${name}${i++}`
    }
    name = candidate
    return {
      ...n,
      properties: [
        ...n.properties,
        { name, required: false, schema: child },
      ],
    }
  })
  return { root: updated, newId: child.id, name }
}

export function removeNode(
  root: SchemaNode,
  id: string,
): SchemaNode {
  switch (root.kind) {
    case "object":
      return {
        ...root,
        properties: root.properties
          .filter((p) => p.schema.id !== id)
          .map((p) => ({ ...p, schema: removeNode(p.schema, id) })),
      }
    case "array":
      if (root.items?.id === id) return { ...root, items: null }
      return {
        ...root,
        items: root.items ? removeNode(root.items, id) : null,
      }
    default:
      return root
  }
}

export function renameProperty(
  root: SchemaNode,
  objectId: string,
  oldName: string,
  newName: string,
): SchemaNode {
  return updateNode(root, objectId, (n) => {
    if (n.kind !== "object") return n
    return {
      ...n,
      properties: n.properties.map((p) =>
        p.name === oldName ? { ...p, name: newName } : p,
      ),
    }
  })
}

export function setRequired(
  root: SchemaNode,
  objectId: string,
  propName: string,
  required: boolean,
): SchemaNode {
  return updateNode(root, objectId, (n) => {
    if (n.kind !== "object") return n
    return {
      ...n,
      properties: n.properties.map((p) =>
        p.name === propName ? { ...p, required } : p,
      ),
    }
  })
}

export function setArrayItems(
  root: SchemaNode,
  arrayId: string,
  kind: Kind,
): { root: SchemaNode; newId: string } {
  const child = newNode(kind)
  const updated = updateNode(root, arrayId, (n) => {
    if (n.kind !== "array") return n
    return { ...n, items: child }
  })
  return { root: updated, newId: child.id }
}

// ────────────── JSON Schema serializer ──────────────

export interface JsonSchema {
  type?: string
  description?: string
  default?: unknown
  format?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  multipleOf?: number
  minItems?: number
  maxItems?: number
  items?: JsonSchema
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean
  enum?: unknown[]
}

export function serialize(node: SchemaNode): JsonSchema {
  switch (node.kind) {
    case "string": {
      const out: JsonSchema = { type: "string" }
      if (node.description) out.description = node.description
      if (node.format) out.format = node.format
      if (node.pattern) out.pattern = node.pattern
      if (typeof node.minLength === "number") out.minLength = node.minLength
      if (typeof node.maxLength === "number") out.maxLength = node.maxLength
      if (node.default !== undefined && node.default !== "")
        out.default = node.default
      return out
    }
    case "number": {
      const out: JsonSchema = { type: node.integer ? "integer" : "number" }
      if (node.description) out.description = node.description
      if (typeof node.minimum === "number") out.minimum = node.minimum
      if (typeof node.maximum === "number") out.maximum = node.maximum
      if (typeof node.multipleOf === "number" && node.multipleOf > 0)
        out.multipleOf = node.multipleOf
      if (typeof node.default === "number") out.default = node.default
      return out
    }
    case "boolean": {
      const out: JsonSchema = { type: "boolean" }
      if (node.description) out.description = node.description
      if (typeof node.default === "boolean") out.default = node.default
      return out
    }
    case "array": {
      const out: JsonSchema = { type: "array" }
      if (node.description) out.description = node.description
      if (typeof node.minItems === "number") out.minItems = node.minItems
      if (typeof node.maxItems === "number") out.maxItems = node.maxItems
      if (node.items) out.items = serialize(node.items)
      return out
    }
    case "object": {
      const out: JsonSchema = { type: "object" }
      if (node.description) out.description = node.description
      const props: Record<string, JsonSchema> = {}
      const required: string[] = []
      for (const p of node.properties) {
        if (!p.name) continue
        props[p.name] = serialize(p.schema)
        if (p.required) required.push(p.name)
      }
      if (Object.keys(props).length > 0) out.properties = props
      if (required.length > 0) out.required = required
      if (node.additionalProperties === false) out.additionalProperties = false
      return out
    }
    case "enum": {
      const out: JsonSchema = {
        type: "string",
        enum: node.values.filter((v) => v !== ""),
      }
      if (node.description) out.description = node.description
      if (node.default && node.values.includes(node.default))
        out.default = node.default
      return out
    }
  }
}

export function serializeWrapped(
  root: SchemaNode,
  wrapper: ToolWrapper,
): unknown {
  const inputSchema = serialize(root)
  if (!wrapper.enabled) return inputSchema
  return {
    name: wrapper.name || "unnamed_tool",
    description: wrapper.description || "",
    inputSchema,
  }
}

// ────────────── JSON Schema → tree (best-effort import) ──────────────

export interface ParseResult {
  ok: boolean
  tree?: SchemaNode
  wrapper?: ToolWrapper
  reason?: string
}

export function parseFromJsonSchema(input: unknown): ParseResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "Expected a JSON Schema object." }
  }
  const obj = input as Record<string, unknown>

  if (
    typeof obj.name === "string" &&
    obj.inputSchema &&
    typeof obj.inputSchema === "object"
  ) {
    const tree = nodeFromSchema(obj.inputSchema as Record<string, unknown>)
    if (!tree) return { ok: false, reason: "Could not parse inputSchema." }
    return {
      ok: true,
      tree,
      wrapper: {
        enabled: true,
        name: obj.name,
        description: typeof obj.description === "string" ? obj.description : "",
      },
    }
  }

  if (Array.isArray(obj.tools) && obj.tools.length > 0) {
    const first = obj.tools[0] as Record<string, unknown>
    return parseFromJsonSchema(first)
  }

  const tree = nodeFromSchema(obj)
  if (!tree) return { ok: false, reason: "Unrecognized schema shape." }
  return { ok: true, tree }
}

function nodeFromSchema(schema: Record<string, unknown>): SchemaNode | null {
  const description =
    typeof schema.description === "string" ? schema.description : undefined

  if (Array.isArray(schema.enum)) {
    const values = schema.enum.filter((v): v is string => typeof v === "string")
    return {
      id: newId(),
      kind: "enum",
      values: values.length > 0 ? values : ["option-1"],
      description,
      default:
        typeof schema.default === "string" && values.includes(schema.default)
          ? schema.default
          : undefined,
    }
  }

  const type = schema.type
  switch (type) {
    case "string":
      return {
        id: newId(),
        kind: "string",
        description,
        format:
          (schema.format as StringFormat) ?? ("" as StringFormat),
        pattern: typeof schema.pattern === "string" ? schema.pattern : undefined,
        minLength:
          typeof schema.minLength === "number" ? schema.minLength : null,
        maxLength:
          typeof schema.maxLength === "number" ? schema.maxLength : null,
        default: typeof schema.default === "string" ? schema.default : undefined,
      }
    case "integer":
    case "number":
      return {
        id: newId(),
        kind: "number",
        integer: type === "integer",
        description,
        minimum: typeof schema.minimum === "number" ? schema.minimum : null,
        maximum: typeof schema.maximum === "number" ? schema.maximum : null,
        multipleOf:
          typeof schema.multipleOf === "number" ? schema.multipleOf : null,
        default: typeof schema.default === "number" ? schema.default : null,
      }
    case "boolean":
      return {
        id: newId(),
        kind: "boolean",
        description,
        default:
          typeof schema.default === "boolean" ? schema.default : null,
      }
    case "array": {
      const items =
        schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)
          ? nodeFromSchema(schema.items as Record<string, unknown>)
          : null
      return {
        id: newId(),
        kind: "array",
        description,
        items,
        minItems: typeof schema.minItems === "number" ? schema.minItems : null,
        maxItems: typeof schema.maxItems === "number" ? schema.maxItems : null,
      }
    }
    case "object":
    default: {
      const propsRaw = (schema.properties ?? {}) as Record<string, unknown>
      const requiredArr = Array.isArray(schema.required)
        ? (schema.required as unknown[]).filter(
            (x): x is string => typeof x === "string",
          )
        : []
      const properties: PropertyEntry[] = []
      for (const [name, sub] of Object.entries(propsRaw)) {
        if (sub && typeof sub === "object" && !Array.isArray(sub)) {
          const child = nodeFromSchema(sub as Record<string, unknown>)
          if (child) {
            properties.push({
              name,
              required: requiredArr.includes(name),
              schema: child,
            })
          }
        }
      }
      return {
        id: newId(),
        kind: "object",
        description,
        properties,
        additionalProperties:
          schema.additionalProperties === false ? false : undefined,
      }
    }
  }
}

// ────────────── Sample-data validator ──────────────

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationOutcome {
  valid: boolean
  errors: ValidationError[]
}

const FORMAT_REGEXES: Record<string, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uri: /^[a-zA-Z][a-zA-Z0-9+.-]*:/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  "date-time":
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
  uuid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  ipv4: /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/,
}

export function validateSample(
  schema: JsonSchema,
  data: unknown,
  path = "$",
): ValidationOutcome {
  const errors: ValidationError[] = []
  walk(schema, data, path, errors)
  return { valid: errors.length === 0, errors }
}

function walk(
  s: JsonSchema,
  d: unknown,
  path: string,
  errors: ValidationError[],
) {
  if (s.enum) {
    if (!s.enum.some((v) => v === d)) {
      errors.push({
        path,
        message: `expected one of ${JSON.stringify(s.enum)}, got ${JSON.stringify(d)}`,
      })
    }
    return
  }
  switch (s.type) {
    case "string":
      if (typeof d !== "string") {
        errors.push({ path, message: `expected string, got ${typeof d}` })
        return
      }
      if (s.format && FORMAT_REGEXES[s.format] && !FORMAT_REGEXES[s.format].test(d)) {
        errors.push({ path, message: `does not match format '${s.format}'` })
      }
      if (s.pattern) {
        try {
          if (!new RegExp(s.pattern).test(d))
            errors.push({ path, message: `does not match pattern ${s.pattern}` })
        } catch {
          errors.push({ path, message: `invalid pattern in schema: ${s.pattern}` })
        }
      }
      if (typeof s.minLength === "number" && d.length < s.minLength)
        errors.push({ path, message: `shorter than minLength=${s.minLength}` })
      if (typeof s.maxLength === "number" && d.length > s.maxLength)
        errors.push({ path, message: `longer than maxLength=${s.maxLength}` })
      return
    case "integer":
      if (typeof d !== "number" || !Number.isInteger(d)) {
        errors.push({ path, message: `expected integer, got ${describe(d)}` })
        return
      }
      checkNumberBounds(s, d, path, errors)
      return
    case "number":
      if (typeof d !== "number" || Number.isNaN(d)) {
        errors.push({ path, message: `expected number, got ${describe(d)}` })
        return
      }
      checkNumberBounds(s, d, path, errors)
      return
    case "boolean":
      if (typeof d !== "boolean")
        errors.push({ path, message: `expected boolean, got ${typeof d}` })
      return
    case "array":
      if (!Array.isArray(d)) {
        errors.push({ path, message: `expected array, got ${describe(d)}` })
        return
      }
      if (typeof s.minItems === "number" && d.length < s.minItems)
        errors.push({ path, message: `fewer items than minItems=${s.minItems}` })
      if (typeof s.maxItems === "number" && d.length > s.maxItems)
        errors.push({ path, message: `more items than maxItems=${s.maxItems}` })
      if (s.items) {
        d.forEach((item, i) => walk(s.items!, item, `${path}[${i}]`, errors))
      }
      return
    case "object":
      if (typeof d !== "object" || d === null || Array.isArray(d)) {
        errors.push({ path, message: `expected object, got ${describe(d)}` })
        return
      }
      if (s.required) {
        for (const name of s.required) {
          if (!(name in (d as Record<string, unknown>)))
            errors.push({
              path: `${path}.${name}`,
              message: `required property is missing`,
            })
        }
      }
      if (s.properties) {
        for (const [k, sub] of Object.entries(s.properties)) {
          if (k in (d as Record<string, unknown>)) {
            walk(sub, (d as Record<string, unknown>)[k], `${path}.${k}`, errors)
          }
        }
      }
      if (s.additionalProperties === false && s.properties) {
        const allowed = new Set(Object.keys(s.properties))
        for (const k of Object.keys(d as Record<string, unknown>)) {
          if (!allowed.has(k))
            errors.push({
              path: `${path}.${k}`,
              message: `additional property not allowed`,
            })
        }
      }
      return
  }
}

function checkNumberBounds(
  s: JsonSchema,
  d: number,
  path: string,
  errors: ValidationError[],
) {
  if (typeof s.minimum === "number" && d < s.minimum)
    errors.push({ path, message: `below minimum=${s.minimum}` })
  if (typeof s.maximum === "number" && d > s.maximum)
    errors.push({ path, message: `above maximum=${s.maximum}` })
  if (typeof s.multipleOf === "number" && s.multipleOf > 0) {
    const ratio = d / s.multipleOf
    if (Math.abs(ratio - Math.round(ratio)) > 1e-9)
      errors.push({ path, message: `not a multiple of ${s.multipleOf}` })
  }
}

function describe(v: unknown): string {
  if (v === null) return "null"
  if (Array.isArray(v)) return "array"
  return typeof v
}

// ────────────── Preset templates ──────────────

export interface Preset {
  id: string
  name: string
  description: string
  build: () => { tree: SchemaNode; wrapper: ToolWrapper }
}

export const PRESETS: Preset[] = [
  {
    id: "file-op",
    name: "File operation tool",
    description: "Read or write a workspace-relative file",
    build: () => ({
      wrapper: {
        enabled: true,
        name: "read_file",
        description: "Read the contents of a file in the workspace.",
      },
      tree: {
        id: newId(),
        kind: "object",
        description: "Inputs for read_file.",
        properties: [
          {
            name: "path",
            required: true,
            schema: {
              id: newId(),
              kind: "string",
              description: "Workspace-relative file path.",
              format: "",
              minLength: 1,
            },
          },
          {
            name: "encoding",
            required: false,
            schema: {
              id: newId(),
              kind: "enum",
              description: "Encoding to read the file as.",
              values: ["utf-8", "base64"],
              default: "utf-8",
            },
          },
        ],
      },
    }),
  },
  {
    id: "api-call",
    name: "API call tool",
    description: "Make an outbound HTTP request",
    build: () => ({
      wrapper: {
        enabled: true,
        name: "http_request",
        description: "Make an HTTP request to an external API.",
      },
      tree: {
        id: newId(),
        kind: "object",
        properties: [
          {
            name: "url",
            required: true,
            schema: {
              id: newId(),
              kind: "string",
              description: "Absolute URL.",
              format: "uri",
            },
          },
          {
            name: "method",
            required: false,
            schema: {
              id: newId(),
              kind: "enum",
              description: "HTTP method.",
              values: ["GET", "POST", "PUT", "PATCH", "DELETE"],
              default: "GET",
            },
          },
          {
            name: "headers",
            required: false,
            schema: {
              id: newId(),
              kind: "object",
              description: "HTTP headers as a flat object.",
              properties: [],
              additionalProperties: true,
            },
          },
          {
            name: "body",
            required: false,
            schema: {
              id: newId(),
              kind: "string",
              description: "Request body, raw.",
              format: "",
            },
          },
          {
            name: "timeout_ms",
            required: false,
            schema: {
              id: newId(),
              kind: "number",
              integer: true,
              description: "Request timeout in milliseconds.",
              minimum: 0,
              maximum: 600000,
              default: 30000,
            },
          },
        ],
      },
    }),
  },
  {
    id: "db-query",
    name: "Database query tool",
    description: "Run a parameterized SQL query",
    build: () => ({
      wrapper: {
        enabled: true,
        name: "db_query",
        description: "Execute a parameterized SQL query against the database.",
      },
      tree: {
        id: newId(),
        kind: "object",
        properties: [
          {
            name: "sql",
            required: true,
            schema: {
              id: newId(),
              kind: "string",
              description: "SQL with $1, $2, … placeholders.",
              format: "",
              minLength: 1,
            },
          },
          {
            name: "params",
            required: false,
            schema: {
              id: newId(),
              kind: "array",
              description: "Positional parameters for the query.",
              items: {
                id: newId(),
                kind: "string",
                format: "",
              },
            },
          },
          {
            name: "limit",
            required: false,
            schema: {
              id: newId(),
              kind: "number",
              integer: true,
              description: "Maximum number of rows to return.",
              minimum: 1,
              maximum: 1000,
              default: 100,
            },
          },
        ],
      },
    }),
  },
  {
    id: "search",
    name: "Search tool",
    description: "Generic full-text search with paging",
    build: () => ({
      wrapper: {
        enabled: true,
        name: "search",
        description: "Full-text search with paging.",
      },
      tree: {
        id: newId(),
        kind: "object",
        properties: [
          {
            name: "query",
            required: true,
            schema: {
              id: newId(),
              kind: "string",
              description: "Search query string.",
              format: "",
              minLength: 1,
            },
          },
          {
            name: "limit",
            required: false,
            schema: {
              id: newId(),
              kind: "number",
              integer: true,
              description: "Max results.",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
          },
          {
            name: "offset",
            required: false,
            schema: {
              id: newId(),
              kind: "number",
              integer: true,
              description: "Skip this many results.",
              minimum: 0,
              default: 0,
            },
          },
        ],
      },
    }),
  },
]
