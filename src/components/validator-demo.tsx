"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const SAMPLE_CONFIG = `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    }
  }
}`

type Result = { valid: true } | { valid: false; reason: string }

function validate(input: string): Result {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (e) {
    return { valid: false, reason: e instanceof Error ? e.message : "Invalid JSON" }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { valid: false, reason: "Top-level must be an object" }
  }
  const servers = (parsed as Record<string, unknown>).mcpServers
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    return { valid: false, reason: "Missing required 'mcpServers' object" }
  }
  for (const [name, raw] of Object.entries(servers as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { valid: false, reason: `Server '${name}' must be an object` }
    }
    const server = raw as Record<string, unknown>
    const hasCommand = typeof server.command === "string"
    const hasUrl = typeof server.url === "string"
    if (!hasCommand && !hasUrl) {
      return {
        valid: false,
        reason: `Server '${name}' needs 'command' (stdio) or 'url' (sse)`,
      }
    }
    if (server.args !== undefined && !Array.isArray(server.args)) {
      return { valid: false, reason: `Server '${name}': 'args' must be an array` }
    }
    if (
      server.env !== undefined &&
      (typeof server.env !== "object" || server.env === null || Array.isArray(server.env))
    ) {
      return { valid: false, reason: `Server '${name}': 'env' must be an object` }
    }
  }
  return { valid: true }
}

export function ValidatorDemo() {
  const [value, setValue] = useState(SAMPLE_CONFIG)
  const result = useMemo(() => validate(value), [value])

  return (
    <div className="mx-auto w-full max-w-3xl text-left">
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-red-500/80" />
            <span className="size-2.5 rounded-full bg-yellow-500/80" />
            <span className="size-2.5 rounded-full bg-green-500/80" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">
              claude_desktop_config.json
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              result.valid
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400",
            )}
          >
            {result.valid ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Valid
              </>
            ) : (
              <>
                <XCircle className="size-3.5" />
                Invalid
              </>
            )}
          </div>
        </div>
        <Textarea
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-64 resize-none rounded-none border-0 bg-transparent font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
        />
        {!result.valid && (
          <div className="border-t border-border/60 bg-red-500/[0.04] px-4 py-3">
            <p className="font-mono text-xs text-red-400">{result.reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}
