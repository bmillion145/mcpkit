export type Transport = "stdio" | "sse" | "http"

export interface EnvRow {
  id: string
  name: string
  value: string
  required: boolean
  sensitive: boolean
}

export interface HeaderRow {
  id: string
  name: string
  value: string
}

export interface GeneratorState {
  serverName: string
  transport: Transport
  command: string
  args: string[]
  url: string
  headers: HeaderRow[]
  env: EnvRow[]
}

export type OutputTarget = "claude-desktop" | "claude-code" | "generic"

export interface BuildResult {
  json: string
  serverObject: Record<string, unknown>
  filenameHint: string
  filenameLocations?: string[]
}

export const EMPTY_STATE: GeneratorState = {
  serverName: "filesystem",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
  url: "",
  headers: [],
  env: [],
}

export function buildServerObject(state: GeneratorState): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  if (state.transport === "stdio") {
    if (state.command.trim() !== "") out.command = state.command.trim()
    const args = state.args.map((a) => a).filter((a) => a.length > 0)
    if (args.length > 0) out.args = args
  } else {
    if (state.url.trim() !== "") out.url = state.url.trim()
    out.type = state.transport
    const headers = state.headers
      .filter((h) => h.name.trim() !== "")
      .reduce<Record<string, string>>((acc, h) => {
        acc[h.name.trim()] = h.value
        return acc
      }, {})
    if (Object.keys(headers).length > 0) out.headers = headers
  }

  const env = state.env
    .filter((e) => e.name.trim() !== "")
    .reduce<Record<string, string>>((acc, e) => {
      const key = e.name.trim()
      acc[key] = e.sensitive ? `\${${key}}` : e.value
      return acc
    }, {})
  if (Object.keys(env).length > 0) out.env = env

  return out
}

export function buildConfig(
  state: GeneratorState,
  target: OutputTarget,
): BuildResult {
  const serverObject = buildServerObject(state)
  const wrapped = {
    mcpServers: {
      [state.serverName.trim() || "unnamed-server"]: serverObject,
    },
  }
  const json = JSON.stringify(wrapped, null, 2)

  switch (target) {
    case "claude-desktop":
      return {
        json,
        serverObject,
        filenameHint: "claude_desktop_config.json",
        filenameLocations: [
          "macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json",
          "Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
          "Linux:   ~/.config/Claude/claude_desktop_config.json",
        ],
      }
    case "claude-code":
      return {
        json,
        serverObject,
        filenameHint: ".mcp.json",
        filenameLocations: [
          "Project root: .mcp.json (commit it for the team)",
          "Or run: claude mcp add-json " +
            (state.serverName.trim() || "unnamed-server"),
        ],
      }
    case "generic":
    default:
      return {
        json,
        serverObject,
        filenameHint: "mcp.json",
      }
  }
}
