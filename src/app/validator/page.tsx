"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  FileJson,
  Info,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react"
import type { editor as MonacoEditor } from "monaco-editor"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  validateMcp,
  type ValidationIssue,
  type ValidationResult,
} from "@/lib/mcp-validator"

const Editor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading editor…
      </div>
    ),
  },
)

const EXAMPLES: { name: string; description: string; config: string }[] = [
  {
    name: "Minimal stdio server",
    description: "Smallest valid client config",
    config: `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}
`,
  },
  {
    name: "SSE server with env vars",
    description: "Remote server, custom headers via env",
    config: `{
  "mcpServers": {
    "linear": {
      "type": "sse",
      "url": "https://mcp.linear.app/sse",
      "env": {
        "LINEAR_API_KEY": "lin_api_xxx",
        "LINEAR_TEAM_ID": "team_abc"
      }
    }
  }
}
`,
  },
  {
    name: "Server with multiple tools",
    description: "Tool-list document with inputSchema",
    config: `{
  "tools": [
    {
      "name": "search_files",
      "description": "Search the workspace for files matching a pattern.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "pattern": { "type": "string", "description": "Glob pattern" },
          "limit":   { "type": "integer", "description": "Max results", "default": 50 }
        },
        "required": ["pattern"]
      }
    },
    {
      "name": "read_file",
      "description": "Read the contents of a file.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" }
        },
        "required": ["path"]
      }
    },
    {
      "name": "write_file",
      "description": "Write content to a file, creating it if necessary.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path":    { "type": "string" },
          "content": { "type": "string" }
        },
        "required": ["path", "content"]
      }
    }
  ]
}
`,
  },
  {
    name: "Common mistakes (invalid)",
    description: "Intentionally broken — exercises the validator",
    config: `{
  "mcpServers": {
    "9bad-name": {
      "command": "",
      "args": "should-be-an-array",
      "env": {
        "api_key": 123,
        "DB_URL": "postgres://x"
      }
    },
    "ambiguous": {
      "command": "node",
      "url": "not a real url",
      "args": ["--token", "\${MISSING_TOKEN}"]
    },
    "remote-http": {
      "url": "ftp://example.com/mcp",
      "type": "websocket"
    },
    "no-transport": {
      "disabled": "yes"
    }
  }
}
`,
  },
]

const DEFAULT_EXAMPLE = EXAMPLES[0].config

const SHARE_INLINE_THRESHOLD = 1500

const EMPTY_RESULT: ValidationResult = {
  valid: true,
  errors: [],
  warnings: [],
  info: [],
  durationMs: 0,
  format: "json",
}

type EditorRef = MonacoEditor.IStandaloneCodeEditor

export default function ValidatorPage() {
  const [code, setCode] = useState(DEFAULT_EXAMPLE)
  const [debouncedCode, setDebouncedCode] = useState(DEFAULT_EXAMPLE)
  const [pristine, setPristine] = useState(true)
  const editorRef = useRef<EditorRef | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const remoteId = params.get("s")
    if (remoteId) {
      let cancelled = false
      ;(async () => {
        try {
          const res = await fetch(`/api/share/${encodeURIComponent(remoteId)}`)
          if (!res.ok) {
            if (!cancelled) {
              toast.error("Shared config not found", {
                description: "The link may have expired or been mistyped.",
              })
            }
            return
          }
          const data = (await res.json()) as { config?: string }
          if (!cancelled && typeof data.config === "string") {
            setCode(data.config)
            setPristine(false)
          }
        } catch {
          if (!cancelled) {
            toast.error("Couldn't load shared config", {
              description: "Network error while fetching the link.",
            })
          }
        }
      })()
      return () => {
        cancelled = true
      }
    }
    const inline = params.get("config")
    if (inline) {
      setCode(inline)
      setPristine(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedCode(code), 300)
    return () => window.clearTimeout(id)
  }, [code])

  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (url.searchParams.has("s")) {
      url.searchParams.delete("s")
    }
    if (debouncedCode.trim() === "" || debouncedCode.length > SHARE_INLINE_THRESHOLD) {
      url.searchParams.delete("config")
    } else {
      url.searchParams.set("config", debouncedCode)
    }
    window.history.replaceState(null, "", url.toString())
  }, [debouncedCode])

  const result = useMemo(
    () => (debouncedCode.trim() === "" ? EMPTY_RESULT : validateMcp(debouncedCode)),
    [debouncedCode],
  )

  const validateNow = useCallback(() => {
    setDebouncedCode((prev) => (prev === code ? prev + "" : code))
  }, [code])

  const handleClear = useCallback(() => {
    setCode("")
    setPristine(false)
    editorRef.current?.focus()
  }, [])

  const handleEditorMount = useCallback(
    (
      editor: EditorRef,
      monaco: typeof import("monaco-editor"),
    ) => {
      editorRef.current = editor

      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => validateNow(),
      )
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
        () => handleClear(),
      )
    },
    [validateNow, handleClear],
  )

  const handleChange = useCallback((next: string | undefined) => {
    setCode(next ?? "")
    setPristine(false)
  }, [])

  const handleFormat = useCallback(() => {
    try {
      const formatted = JSON.stringify(JSON.parse(code), null, 2) + "\n"
      setCode(formatted)
    } catch {
      editorRef.current?.getAction("editor.action.formatDocument")?.run()
    }
  }, [code])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setCode(text)
        setPristine(false)
      }
    } catch {
      // Clipboard permissions denied — silent.
    }
  }, [])

  const handleLoadExample = useCallback((config: string) => {
    setCode(config)
    setPristine(false)
  }, [])

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return

    const writeAndToast = async (link: string, description: string) => {
      try {
        await navigator.clipboard.writeText(link)
        toast.success("Link copied to clipboard", { description })
      } catch {
        toast.error("Couldn't copy to clipboard", {
          description: "Your browser blocked clipboard access.",
        })
      }
    }

    if (code.length <= SHARE_INLINE_THRESHOLD) {
      await writeAndToast(
        window.location.href,
        "Anyone with the link gets the same config pre-loaded.",
      )
      return
    }

    const toastId = toast.loading("Publishing share link…")
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: code }),
      })
      if (!res.ok) {
        toast.dismiss(toastId)
        if (res.status === 503) {
          toast.error("Sharing isn't configured on this deployment", {
            description: "Set DATABASE_URL to enable persistent share links.",
          })
        } else {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null
          toast.error("Couldn't publish share", {
            description: body?.error ?? `Server returned ${res.status}.`,
          })
        }
        return
      }
      const { id } = (await res.json()) as { id: string }
      const url = new URL(window.location.href)
      url.searchParams.delete("config")
      url.searchParams.set("s", id)
      window.history.replaceState(null, "", url.toString())
      toast.dismiss(toastId)
      await writeAndToast(
        url.toString(),
        "Stored server-side — the URL stays short no matter how big the config.",
      )
    } catch {
      toast.dismiss(toastId)
      toast.error("Couldn't publish share", {
        description: "Network error while contacting the share API.",
      })
    }
  }, [code])

  const handleReplaceWithJson = useCallback(() => {
    if (!result.normalizedJson) return
    setCode(result.normalizedJson + (result.normalizedJson.endsWith("\n") ? "" : "\n"))
    setPristine(false)
    toast.success("Replaced with normalized JSON")
  }, [result.normalizedJson])

  useEffect(() => {
    if (typeof window === "undefined") return
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === "Enter") {
        e.preventDefault()
        validateNow()
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault()
        handleClear()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [validateNow, handleClear])

  const handleJumpTo = useCallback((path: string) => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return

    const segments = path.split("/").filter(Boolean).map(decodePointer)
    const text = model.getValue()
    let cursor = 0
    for (const seg of segments) {
      const isIndex = /^\d+$/.test(seg)
      if (isIndex) continue
      const needle = `"${seg}"`
      const found = text.indexOf(needle, cursor)
      if (found === -1) break
      cursor = found + needle.length
    }
    if (cursor === 0) return
    const pos = model.getPositionAt(cursor)
    editor.revealLineInCenter(pos.lineNumber)
    editor.setPosition(pos)
    editor.focus()
  }, [])

  const totalIssues =
    result.errors.length + result.warnings.length + result.info.length

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <FileJson className="size-4 text-muted-foreground" />
            <span className="font-mono text-sm">MCP Validator</span>
          </div>
          <div className="w-16 text-right" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-card/40">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePaste}
                className="h-8 gap-1.5"
              >
                <ClipboardPaste className="size-3.5" />
                Paste
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                    <Sparkles className="size-3.5" />
                    Examples
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {EXAMPLES.map((ex) => (
                    <DropdownMenuItem
                      key={ex.name}
                      onClick={() => handleLoadExample(ex.config)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="text-sm font-medium">{ex.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ex.description}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFormat}
                className="h-8 gap-1.5"
              >
                <Wand2 className="size-3.5" />
                Format JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleShare}
                className="h-8 gap-1.5"
              >
                <Link2 className="size-3.5" />
                Share
              </Button>
              <div className="ml-auto" />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/60 bg-muted/10 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span className="font-mono">
                {code.length.toLocaleString()} chars
              </span>
              {!pristine && (
                <>
                  <span className="text-border">·</span>
                  <span className="font-mono">
                    {result.durationMs < 1
                      ? `${(result.durationMs * 1000).toFixed(0)}μs`
                      : `${result.durationMs.toFixed(2)}ms`}
                  </span>
                </>
              )}
              {result.format === "yaml" && (
                <>
                  <span className="text-border">·</span>
                  <Badge
                    variant="secondary"
                    className="h-4 rounded-full px-1.5 py-0 text-[10px] font-mono"
                  >
                    YAML
                  </Badge>
                </>
              )}
              {code.length > 100_000 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="size-3" />
                  Configs over 100KB may slow the editor.
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                {result.normalizedJson && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReplaceWithJson}
                    className="h-6 gap-1.5 px-2 text-[11px]"
                  >
                    <FileJson className="size-3" />
                    Replace with JSON
                  </Button>
                )}
                <kbd className="hidden rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
                  ⌘↵ validate
                </kbd>
                <kbd className="hidden rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
                  ⌘K clear
                </kbd>
              </span>
            </div>
            <div className="h-[60vh] min-h-[420px] md:h-[calc(100vh-12rem)]">
              <Editor
                value={code}
                onChange={handleChange}
                onMount={handleEditorMount}
                language="json"
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily:
                    "var(--font-geist-mono), ui-monospace, monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  wordWrap: "on",
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: "gutter",
                  smoothScrolling: true,
                  automaticLayout: true,
                }}
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-card/40">
            <ResultsHeader pristine={pristine} result={result} />
            <div className="flex-1 overflow-y-auto md:max-h-[calc(100vh-12rem)]">
              {totalIssues === 0 ? (
                <EmptyState pristine={pristine} valid={result.valid} />
              ) : (
                <IssueGroups result={result} onJumpTo={handleJumpTo} />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function ResultsHeader({
  pristine,
  result,
}: {
  pristine: boolean
  result: ValidationResult
}) {
  const errorCount = result.errors.length
  const warningCount = result.warnings.length
  const infoCount = result.info.length

  if (pristine && result.valid) {
    return (
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          >
            <Check className="mr-1 size-3" strokeWidth={3} />
            Valid
          </Badge>
          <span className="text-xs text-muted-foreground">
            Example config passes all checks
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
      <div className="flex items-center gap-2">
        {result.valid ? (
          <Badge
            variant="secondary"
            className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          >
            <Check className="mr-1 size-3" strokeWidth={3} />
            Valid
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="rounded-full border-red-500/30 bg-red-500/10 text-red-400"
          >
            <XCircle className="mr-1 size-3" />
            {errorCount} {errorCount === 1 ? "error" : "errors"} found
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {warningCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="size-3 text-amber-400" />
            {warningCount} {warningCount === 1 ? "warning" : "warnings"}
          </span>
        )}
        {infoCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Info className="size-3 text-sky-400" />
            {infoCount} info
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  pristine,
  valid,
}: {
  pristine: boolean
  valid: boolean
}) {
  if (!valid) return null
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <Check className="size-5 text-emerald-400" strokeWidth={3} />
      </div>
      <p className="text-sm font-medium">No issues found</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {pristine
          ? "Edit the config on the left to see live validation results here."
          : "Your config is valid against the MCP specification."}
      </p>
    </div>
  )
}

function IssueGroups({
  result,
  onJumpTo,
}: {
  result: ValidationResult
  onJumpTo: (path: string) => void
}) {
  return (
    <div className="divide-y divide-border/60">
      {result.errors.length > 0 && (
        <IssueSection
          title="Errors"
          count={result.errors.length}
          icon={<XCircle className="size-3.5 text-red-400" />}
          issues={result.errors}
          onJumpTo={onJumpTo}
          tone="error"
        />
      )}
      {result.warnings.length > 0 && (
        <IssueSection
          title="Warnings"
          count={result.warnings.length}
          icon={<AlertTriangle className="size-3.5 text-amber-400" />}
          issues={result.warnings}
          onJumpTo={onJumpTo}
          tone="warning"
        />
      )}
      {result.info.length > 0 && (
        <IssueSection
          title="Info"
          count={result.info.length}
          icon={<Info className="size-3.5 text-sky-400" />}
          issues={result.info}
          onJumpTo={onJumpTo}
          tone="info"
        />
      )}
    </div>
  )
}

function IssueSection({
  title,
  count,
  icon,
  issues,
  onJumpTo,
  tone,
}: {
  title: string
  count: number
  icon: React.ReactNode
  issues: ValidationIssue[]
  onJumpTo: (path: string) => void
  tone: "error" | "warning" | "info"
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{title}</span>
        <span className="text-muted-foreground/60">{count}</span>
      </div>
      <ul className="px-2 pb-2">
        {issues.map((issue, i) => (
          <IssueRow
            key={`${issue.code}-${i}`}
            issue={issue}
            onJumpTo={onJumpTo}
            tone={tone}
          />
        ))}
      </ul>
    </div>
  )
}

function IssueRow({
  issue,
  onJumpTo,
  tone,
}: {
  issue: ValidationIssue
  onJumpTo: (path: string) => void
  tone: "error" | "warning" | "info"
}) {
  const [open, setOpen] = useState(false)
  const hasDetails = Boolean(issue.suggestion || issue.code)
  const toneStyles = {
    error: "hover:border-red-500/30 hover:bg-red-500/[0.04]",
    warning: "hover:border-amber-500/30 hover:bg-amber-500/[0.04]",
    info: "hover:border-sky-500/30 hover:bg-sky-500/[0.04]",
  }[tone]
  const iconByTone = {
    error: <AlertCircle className="size-3.5 shrink-0 text-red-400" />,
    warning: <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />,
    info: <Info className="size-3.5 shrink-0 text-sky-400" />,
  }[tone]

  return (
    <li
      className={cn(
        "rounded-lg border border-transparent transition-colors",
        toneStyles,
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (hasDetails) setOpen((v) => !v)
          onJumpTo(issue.path)
        }}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
      >
        {iconByTone}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">{issue.message}</p>
          {issue.path && (
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
              {issue.path}
            </p>
          )}
        </div>
        {hasDetails && (
          <ChevronRight
            className={cn(
              "mt-0.5 size-3.5 shrink-0 text-muted-foreground/60 transition-transform",
              open && "rotate-90",
            )}
          />
        )}
      </button>
      {open && hasDetails && (
        <div className="space-y-2 px-3 pb-3 pl-9">
          {issue.suggestion && (
            <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {issue.suggestion}
            </p>
          )}
          <Separator className="bg-border/40" />
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
            {issue.code}
          </p>
        </div>
      )}
    </li>
  )
}

function decodePointer(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~")
}
