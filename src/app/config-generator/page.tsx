"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Copy,
  Download,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ToolSwitcher } from "@/components/tool-switcher"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  buildConfig,
  EMPTY_STATE,
  type EnvRow,
  type GeneratorState,
  type HeaderRow,
  type OutputTarget,
  type Transport,
} from "@/lib/mcp-config-generator"
import { validateMcp } from "@/lib/mcp-validator"

const NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/
const ENV_KEY_RE = /^[A-Z_][A-Z0-9_]*$/

let rowSeq = 0
const nextId = () => `r${++rowSeq}`

function newEnvRow(partial: Partial<EnvRow> = {}): EnvRow {
  return {
    id: nextId(),
    name: "",
    value: "",
    required: false,
    sensitive: false,
    ...partial,
  }
}

function newHeaderRow(partial: Partial<HeaderRow> = {}): HeaderRow {
  return { id: nextId(), name: "", value: "", ...partial }
}

export default function ConfigGeneratorPage() {
  const [state, setState] = useState<GeneratorState>(() => ({
    ...EMPTY_STATE,
    headers: [newHeaderRow()],
    env: [newEnvRow({ name: "LOG_LEVEL", value: "info" })],
  }))
  const [target, setTarget] = useState<OutputTarget>("claude-desktop")
  const [importedTool, setImportedTool] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const raw = params.get("tool")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      setImportedTool(JSON.stringify(parsed, null, 2))
    } catch {
      setImportedTool(raw)
    }
  }, [])

  const setName = useCallback((serverName: string) => {
    setState((s) => ({ ...s, serverName }))
  }, [])

  const setTransport = useCallback((t: Transport) => {
    setState((s) => ({ ...s, transport: t }))
  }, [])

  const setCommand = useCallback((command: string) => {
    setState((s) => ({ ...s, command }))
  }, [])

  const setUrl = useCallback((url: string) => {
    setState((s) => ({ ...s, url }))
  }, [])

  const addArg = useCallback(() => {
    setState((s) => ({ ...s, args: [...s.args, ""] }))
  }, [])

  const setArg = useCallback((i: number, v: string) => {
    setState((s) => ({
      ...s,
      args: s.args.map((a, idx) => (idx === i ? v : a)),
    }))
  }, [])

  const removeArg = useCallback((i: number) => {
    setState((s) => ({ ...s, args: s.args.filter((_, idx) => idx !== i) }))
  }, [])

  const addHeader = useCallback(() => {
    setState((s) => ({ ...s, headers: [...s.headers, newHeaderRow()] }))
  }, [])

  const updateHeader = useCallback(
    (id: string, patch: Partial<HeaderRow>) => {
      setState((s) => ({
        ...s,
        headers: s.headers.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      }))
    },
    [],
  )

  const removeHeader = useCallback((id: string) => {
    setState((s) => ({ ...s, headers: s.headers.filter((h) => h.id !== id) }))
  }, [])

  const addEnv = useCallback(() => {
    setState((s) => ({ ...s, env: [...s.env, newEnvRow()] }))
  }, [])

  const updateEnv = useCallback((id: string, patch: Partial<EnvRow>) => {
    setState((s) => ({
      ...s,
      env: s.env.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  }, [])

  const removeEnv = useCallback((id: string) => {
    setState((s) => ({ ...s, env: s.env.filter((e) => e.id !== id) }))
  }, [])

  const result = useMemo(() => buildConfig(state, target), [state, target])
  const validation = useMemo(() => validateMcp(result.json), [result.json])
  const validateHref = useMemo(
    () => `/validator?config=${encodeURIComponent(result.json)}`,
    [result.json],
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.json)
      toast.success("Config copied to clipboard")
    } catch {
      toast.error("Couldn't copy", {
        description: "Browser blocked clipboard access.",
      })
    }
  }, [result.json])

  const handleDownload = useCallback(() => {
    const blob = new Blob([result.json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = result.filenameHint
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Saved as ${result.filenameHint}`)
  }, [result])

  const nameValid =
    state.serverName.trim() === "" || NAME_RE.test(state.serverName.trim())

  const issueCount =
    validation.errors.length +
    validation.warnings.length +
    validation.info.length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-sm font-semibold tracking-tight">
            Config Generator
          </h1>
          <Badge variant="secondary" className="font-mono text-[10px]">
            beta
          </Badge>
          <ToolSwitcher className="ml-2" />
          <div className="ml-auto" />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:py-8">
        <section>
          <Tabs defaultValue="server" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="server">Server Setup</TabsTrigger>
              <TabsTrigger value="env">Environment Variables</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
            </TabsList>

            <TabsContent value="server" className="mt-4">
              <ServerSetup
                state={state}
                nameValid={nameValid}
                setName={setName}
                setTransport={setTransport}
                setCommand={setCommand}
                setUrl={setUrl}
                addArg={addArg}
                setArg={setArg}
                removeArg={removeArg}
                addHeader={addHeader}
                updateHeader={updateHeader}
                removeHeader={removeHeader}
              />
            </TabsContent>

            <TabsContent value="env" className="mt-4">
              <EnvSection
                rows={state.env}
                addEnv={addEnv}
                updateEnv={updateEnv}
                removeEnv={removeEnv}
              />
            </TabsContent>

            <TabsContent value="output" className="mt-4">
              <OutputSection
                target={target}
                setTarget={setTarget}
                result={result}
                onCopy={handleCopy}
                onDownload={handleDownload}
                validateHref={validateHref}
              />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="space-y-4 md:sticky md:top-20 md:self-start">
          {importedTool && (
            <ImportedToolPanel
              json={importedTool}
              onDismiss={() => setImportedTool(null)}
            />
          )}
          <PreviewPanel
            json={result.json}
            valid={validation.valid}
            errors={validation.errors.length}
            warnings={validation.warnings.length}
            info={validation.info.length}
            issueCount={issueCount}
            firstError={validation.errors[0]?.message}
          />
        </aside>
      </main>
    </div>
  )
}

interface ServerSetupProps {
  state: GeneratorState
  nameValid: boolean
  setName: (v: string) => void
  setTransport: (t: Transport) => void
  setCommand: (v: string) => void
  setUrl: (v: string) => void
  addArg: () => void
  setArg: (i: number, v: string) => void
  removeArg: (i: number) => void
  addHeader: () => void
  updateHeader: (id: string, patch: Partial<HeaderRow>) => void
  removeHeader: (id: string) => void
}

function ServerSetup({
  state,
  nameValid,
  setName,
  setTransport,
  setCommand,
  setUrl,
  addArg,
  setArg,
  removeArg,
  addHeader,
  updateHeader,
  removeHeader,
}: ServerSetupProps) {
  const nameId = useId()
  return (
    <div className="space-y-6 rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="space-y-2">
        <Label htmlFor={nameId}>
          Server name <span className="text-red-400">*</span>
        </Label>
        <Input
          id={nameId}
          placeholder="filesystem"
          value={state.serverName}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!nameValid}
          className={cn(
            "font-mono",
            !nameValid && "border-red-500/40 focus-visible:ring-red-500/40",
          )}
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, digits, and hyphens. Used as the key under{" "}
          <code className="rounded bg-muted/40 px-1 py-0.5 font-mono">
            mcpServers
          </code>
          .
        </p>
      </div>

      <Separator className="bg-border/60" />

      <div className="space-y-3">
        <Label>Transport</Label>
        <RadioGroup
          value={state.transport}
          onValueChange={(v) => setTransport(v as Transport)}
          className="grid grid-cols-3 gap-3"
        >
          <TransportOption value="stdio" label="stdio" hint="Subprocess" />
          <TransportOption value="sse" label="sse" hint="Server-Sent Events" />
          <TransportOption value="http" label="http" hint="Streamable HTTP" />
        </RadioGroup>
      </div>

      <Separator className="bg-border/60" />

      {state.transport === "stdio" ? (
        <StdioFields
          state={state}
          setCommand={setCommand}
          addArg={addArg}
          setArg={setArg}
          removeArg={removeArg}
        />
      ) : (
        <RemoteFields
          state={state}
          setUrl={setUrl}
          addHeader={addHeader}
          updateHeader={updateHeader}
          removeHeader={removeHeader}
        />
      )}
    </div>
  )
}

function TransportOption({
  value,
  label,
  hint,
}: {
  value: Transport
  label: string
  hint: string
}) {
  return (
    <Label className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-card has-[:checked]:border-primary/60 has-[:checked]:bg-primary/5">
      <RadioGroupItem value={value} className="mt-0.5" />
      <div className="space-y-0.5">
        <div className="font-mono text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </Label>
  )
}

function StdioFields({
  state,
  setCommand,
  addArg,
  setArg,
  removeArg,
}: {
  state: GeneratorState
  setCommand: (v: string) => void
  addArg: () => void
  setArg: (i: number, v: string) => void
  removeArg: (i: number) => void
}) {
  const cmdId = useId()
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={cmdId}>Command</Label>
        <Input
          id={cmdId}
          placeholder="npx"
          value={state.command}
          onChange={(e) => setCommand(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Args</Label>
          <Button
            size="sm"
            variant="ghost"
            onClick={addArg}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="size-3.5" />
            Add arg
          </Button>
        </div>
        {state.args.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
            No args yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {state.args.map((arg, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-6 text-right font-mono text-xs text-muted-foreground">
                  {i}
                </span>
                <Input
                  value={arg}
                  onChange={(e) => setArg(i, e.target.value)}
                  className="font-mono"
                  placeholder={i === 0 ? "-y" : `arg ${i}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeArg(i)}
                  aria-label={`Remove arg ${i}`}
                  className="size-8 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RemoteFields({
  state,
  setUrl,
  addHeader,
  updateHeader,
  removeHeader,
}: {
  state: GeneratorState
  setUrl: (v: string) => void
  addHeader: () => void
  updateHeader: (id: string, patch: Partial<HeaderRow>) => void
  removeHeader: (id: string) => void
}) {
  const urlId = useId()
  let urlValid = true
  if (state.url.trim() !== "") {
    try {
      const u = new URL(state.url)
      urlValid = u.protocol === "http:" || u.protocol === "https:"
    } catch {
      urlValid = false
    }
  }
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={urlId}>URL</Label>
        <Input
          id={urlId}
          placeholder="https://example.com/mcp"
          value={state.url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={!urlValid}
          className={cn(
            "font-mono",
            !urlValid && "border-red-500/40 focus-visible:ring-red-500/40",
          )}
        />
        {!urlValid && (
          <p className="text-xs text-red-400">
            URL must be a valid http(s) URL.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button
            size="sm"
            variant="ghost"
            onClick={addHeader}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="size-3.5" />
            Add header
          </Button>
        </div>
        {state.headers.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
            No headers yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {state.headers.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                <Input
                  value={h.name}
                  onChange={(e) => updateHeader(h.id, { name: e.target.value })}
                  placeholder="Authorization"
                  className="font-mono"
                />
                <Input
                  value={h.value}
                  onChange={(e) =>
                    updateHeader(h.id, { value: e.target.value })
                  }
                  placeholder="Bearer ${TOKEN}"
                  className="font-mono"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeHeader(h.id)}
                  aria-label={`Remove header ${h.name || "row"}`}
                  className="size-8 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EnvSection({
  rows,
  addEnv,
  updateEnv,
  removeEnv,
}: {
  rows: EnvRow[]
  addEnv: () => void
  updateEnv: (id: string, patch: Partial<EnvRow>) => void
  removeEnv: (id: string) => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Environment variables</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sensitive rows render as{" "}
            <code className="rounded bg-muted/40 px-1 py-0.5 font-mono">
              ${"{NAME}"}
            </code>{" "}
            so you can safely commit the config.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={addEnv} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" />
          Add variable
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
          No environment variables yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const keyOk = row.name.trim() === "" || ENV_KEY_RE.test(row.name.trim())
            return (
              <li
                key={row.id}
                className="rounded-lg border border-border/60 bg-card/30 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={row.name}
                    onChange={(e) => updateEnv(row.id, { name: e.target.value })}
                    placeholder="API_KEY"
                    aria-invalid={!keyOk}
                    className={cn(
                      "font-mono uppercase",
                      !keyOk &&
                        "border-amber-500/40 focus-visible:ring-amber-500/40",
                    )}
                  />
                  <Input
                    value={row.sensitive ? `\${${row.name.trim() || "VAR_NAME"}}` : row.value}
                    onChange={(e) => updateEnv(row.id, { value: e.target.value })}
                    placeholder={row.sensitive ? "(rendered from name)" : "value"}
                    disabled={row.sensitive}
                    className="font-mono"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeEnv(row.id)}
                    aria-label={`Remove ${row.name || "row"}`}
                    className="size-9 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  <Label className="flex items-center gap-2">
                    <Switch
                      checked={row.required}
                      onCheckedChange={(v) =>
                        updateEnv(row.id, { required: Boolean(v) })
                      }
                    />
                    Required
                  </Label>
                  <Label className="flex items-center gap-2">
                    <Switch
                      checked={row.sensitive}
                      onCheckedChange={(v) =>
                        updateEnv(row.id, { sensitive: Boolean(v) })
                      }
                    />
                    Sensitive (use{" "}
                    <code className="font-mono">${"{NAME}"}</code>)
                  </Label>
                  {!keyOk && (
                    <span className="text-amber-400">
                      Convention: UPPER_SNAKE_CASE
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function OutputSection({
  target,
  setTarget,
  result,
  onCopy,
  onDownload,
  validateHref,
}: {
  target: OutputTarget
  setTarget: (t: OutputTarget) => void
  result: ReturnType<typeof buildConfig>
  onCopy: () => void
  onDownload: () => void
  validateHref: string
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-5">
      <Tabs
        value={target}
        onValueChange={(v) => setTarget(v as OutputTarget)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
          <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
          <TabsTrigger value="generic">Generic JSON</TabsTrigger>
        </TabsList>
        <TabsContent value={target} className="mt-4 space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
            <div className="font-mono text-foreground">
              {result.filenameHint}
            </div>
            {result.filenameLocations && (
              <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                {result.filenameLocations.map((loc) => (
                  <li key={loc}>{loc}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onCopy} className="gap-1.5">
              <Copy className="size-3.5" />
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={onDownload} className="gap-1.5">
              <Download className="size-3.5" />
              Download
            </Button>
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link href={validateHref}>
                Validate this config
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PreviewPanel({
  json,
  valid,
  errors,
  warnings,
  info,
  issueCount,
  firstError,
}: {
  json: string
  valid: boolean
  errors: number
  warnings: number
  info: number
  issueCount: number
  firstError?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-red-500/80" />
          <span className="size-2.5 rounded-full bg-yellow-500/80" />
          <span className="size-2.5 rounded-full bg-green-500/80" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            preview
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            valid
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400",
          )}
        >
          {valid ? (
            <>
              <CheckCircle2 className="size-3.5" />
              Valid
            </>
          ) : (
            <>
              <XCircle className="size-3.5" />
              {errors} {errors === 1 ? "error" : "errors"}
            </>
          )}
        </div>
      </div>
      <pre className="max-h-[60vh] overflow-auto bg-background/40 p-4 font-mono text-xs leading-relaxed">
        {json}
      </pre>
      {(warnings > 0 || info > 0 || !valid) && (
        <div className="space-y-1 border-t border-border/60 bg-muted/10 px-4 py-3 text-xs">
          {!valid && firstError && (
            <p className="flex items-start gap-2 text-red-400">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {firstError}
            </p>
          )}
          {warnings > 0 && (
            <p className="text-amber-400">
              {warnings} {warnings === 1 ? "warning" : "warnings"}
            </p>
          )}
          {info > 0 && (
            <p className="text-muted-foreground">
              {info} info {info === 1 ? "note" : "notes"}
            </p>
          )}
        </div>
      )}
      {valid && issueCount === 0 && (
        <div className="border-t border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
          Validated against the MCP spec — no issues.
        </div>
      )}
    </div>
  )
}

function ImportedToolPanel({
  json,
  onDismiss,
}: {
  json: string
  onDismiss: () => void
}) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      toast.success("Tool schema copied")
    } catch {
      toast.error("Couldn't copy to clipboard")
    }
  }
  return (
    <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/[0.04]">
      <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Boxes className="size-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-300">
            Tool schema imported from Schema Builder
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss imported tool schema"
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      <pre className="max-h-48 overflow-auto bg-background/40 p-3 font-mono text-[11px] leading-relaxed">
        {json}
      </pre>
      <div className="flex gap-2 border-t border-amber-500/20 px-3 py-2">
        <Button size="sm" variant="outline" onClick={onCopy} className="gap-1.5">
          <Copy className="size-3.5" />
          Copy schema
        </Button>
        <p className="self-center text-[11px] text-muted-foreground">
          Paste this into your server&apos;s tool definitions.
        </p>
      </div>
    </div>
  )
}
