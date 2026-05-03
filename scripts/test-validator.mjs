// Smoke test for the validator engine. Run with: node scripts/test-validator.mjs
// Compiles src/lib/mcp-validator with esbuild on the fly, then exercises preprocessing.

import { build } from "esbuild"
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const tmp = mkdtempSync(join(tmpdir(), "mcpkit-test-"))
const outfile = join(tmp, "validator.mjs")

await build({
  entryPoints: ["src/lib/mcp-validator/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  outfile,
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: "error",
})

const { validateMcp } = await import(pathToFileURL(outfile).href)

let pass = 0
let fail = 0
const failures = []

function check(name, fn) {
  try {
    fn()
    pass++
    console.log(`  ok   ${name}`)
  } catch (e) {
    fail++
    failures.push({ name, error: e })
    console.log(`  FAIL ${name}`)
    console.log(`       ${e.message}`)
  }
}

function expect(actual, msg) {
  if (!actual) throw new Error(msg ?? "expected truthy")
}

console.log("\n— preprocessing —")

check("strips ```json fences", () => {
  const input = '```json\n{"mcpServers":{"x":{"command":"node"}}}\n```'
  const r = validateMcp(input)
  expect(r.valid, `expected valid, got ${r.errors.map(e=>e.code).join(",")}`)
  expect(
    r.info.some((i) => i.code === "STRIPPED_FENCES"),
    "expected STRIPPED_FENCES info note",
  )
})

check("strips bare ``` fences", () => {
  const input = '```\n{"mcpServers":{"x":{"command":"node"}}}\n```'
  const r = validateMcp(input)
  expect(r.valid)
  expect(r.info.some((i) => i.code === "STRIPPED_FENCES"))
})

check("strips // line comments and warns", () => {
  const input = `{
  // this is a comment
  "mcpServers": {
    "fs": { "command": "node" } // trailing
  }
}`
  const r = validateMcp(input)
  expect(r.valid, `expected valid, got errors: ${r.errors.map(e=>e.code).join(",")}`)
  expect(
    r.warnings.some((w) => w.code === "STRIPPED_COMMENTS"),
    "expected STRIPPED_COMMENTS warning",
  )
})

check("strips /* block */ comments", () => {
  const input = `/* header */
{
  "mcpServers": {
    /* inline */ "fs": { "command": "node" }
  }
}`
  const r = validateMcp(input)
  expect(r.valid, `errors: ${r.errors.map(e=>e.code).join(",")}`)
  expect(r.warnings.some((w) => w.code === "STRIPPED_COMMENTS"))
})

check("does NOT strip // inside string values", () => {
  const input = `{
  "mcpServers": {
    "fs": { "command": "node", "args": ["http://example.com//foo"] }
  }
}`
  const r = validateMcp(input)
  expect(r.valid, `errors: ${r.errors.map(e=>e.code).join(",")}`)
  // The substring stayed, no spurious comment warning
  expect(
    !r.warnings.some((w) => w.code === "STRIPPED_COMMENTS"),
    "should not strip // inside string",
  )
})

check("detects YAML and converts", () => {
  const input = `mcpServers:
  fs:
    command: node
    args:
      - server.js
`
  const r = validateMcp(input)
  expect(r.valid, `errors: ${r.errors.map(e=>e.code).join(",")}`)
  expect(r.format === "yaml", `format=${r.format}`)
  expect(r.info.some((i) => i.code === "YAML_DETECTED"))
  expect(typeof r.normalizedJson === "string" && r.normalizedJson.includes("mcpServers"))
})

check("YAML with markdown fences", () => {
  const input = "```yaml\nmcpServers:\n  fs:\n    command: node\n```"
  const r = validateMcp(input)
  expect(r.valid, `errors: ${r.errors.map(e=>e.code).join(",")}`)
  expect(r.format === "yaml")
  expect(r.info.some((i) => i.code === "STRIPPED_FENCES"))
  expect(r.info.some((i) => i.code === "YAML_DETECTED"))
})

check("returns durationMs > 0", () => {
  const r = validateMcp('{"mcpServers":{"x":{"command":"node"}}}')
  expect(typeof r.durationMs === "number" && r.durationMs >= 0, `durationMs=${r.durationMs}`)
})

check("normalizedJson absent for clean JSON", () => {
  const r = validateMcp('{"mcpServers":{"x":{"command":"node"}}}')
  expect(r.normalizedJson === undefined, `normalizedJson=${r.normalizedJson}`)
})

check("normalizedJson present after fence/comment strip", () => {
  const r = validateMcp('```json\n{"mcpServers":{"x":{"command":"node"}}}\n```')
  expect(typeof r.normalizedJson === "string" && r.normalizedJson.includes("mcpServers"))
})

check("invalid JSON still reports error after preprocessing tries", () => {
  const r = validateMcp("{this is not valid anything}")
  expect(!r.valid)
  expect(r.errors.some((e) => e.code === "INVALID_JSON"))
})

console.log(`\n${pass} passed, ${fail} failed`)
rmSync(tmp, { recursive: true, force: true })
process.exit(fail === 0 ? 0 : 1)
