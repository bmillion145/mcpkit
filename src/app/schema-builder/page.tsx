"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Hash,
  List,
  Plus,
  Sparkles,
  TextCursorInput,
  ToggleLeft,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToolSwitcher } from "@/components/tool-switcher"
import { cn } from "@/lib/utils"
import {
  addProperty,
  defaultRoot,
  parseFromJsonSchema,
  findNode,
  findParent,
  PRESETS,
  removeNode,
  renameProperty,
  replaceNodeKind,
  serialize,
  serializeWrapped,
  setArrayItems,
  setRequired,
  updateNode,
  validateSample,
  type ArrayNode,
  type BooleanNode,
  type EnumNode,
  type Kind,
  type NumberNode,
  type ObjectNode,
  type SchemaNode,
  type StringNode,
  type ToolWrapper,
} from "@/lib/mcp-schema-builder"

const KIND_LABEL: Record<Kind, string> = {
  string: "String",
  number: "Number",
  boolean: "Boolean",
  array: "Array",
  object: "Object",
  enum: "Enum",
}

const KIND_ICONS: Record<Kind, typeof Hash> = {
  string: TextCursorInput,
  number: Hash,
  boolean: ToggleLeft,
  array: List,
  object: Boxes,
  enum: List,
}

export default function SchemaBuilderPage() {
  const [root, setRoot] = useState<SchemaNode>(() => defaultRoot())
  const [selectedId, setSelectedId] = useState<string>(() => "")
  const [wrapper, setWrapper] = useState<ToolWrapper>({
    enabled: false,
    name: "",
    description: "",
  })
  const [sample, setSample] = useState("{}")

  useEffect(() => {
    if (!selectedId) setSelectedId(root.id)
  }, [selectedId, root.id])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const raw = params.get("tools")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      const result = parseFromJsonSchema(parsed)
      if (result.ok && result.tree) {
        setRoot(result.tree)
        setSelectedId(result.tree.id)
        if (result.wrapper) setWrapper(result.wrapper)
        toast.success("Imported schema from URL")
      } else {
        toast.error("Couldn't import schema", {
          description: result.reason ?? "Unrecognized shape.",
        })
      }
    } catch (e) {
      toast.error("Couldn't import schema", {
        description: e instanceof Error ? e.message : "Invalid JSON in URL.",
      })
    }
  }, [])

  const selected = useMemo(
    () => (selectedId ? findNode(root, selectedId) : null),
    [root, selectedId],
  )
  const parentOfSelected = useMemo(
    () => (selectedId ? findParent(root, selectedId) : null),
    [root, selectedId],
  )

  const output = useMemo(
    () => serializeWrapped(root, wrapper),
    [root, wrapper],
  )
  const outputJson = useMemo(() => JSON.stringify(output, null, 2), [output])

  const useInConfigHref = useMemo(
    () => `/config-generator?tool=${encodeURIComponent(outputJson)}`,
    [outputJson],
  )

  const inputSchema = useMemo(() => serialize(root), [root])

  const sampleResult = useMemo(() => {
    try {
      const parsed = JSON.parse(sample)
      return validateSample(inputSchema, parsed)
    } catch (e) {
      return {
        valid: false,
        errors: [
          {
            path: "$",
            message: e instanceof Error ? e.message : "invalid JSON",
          },
        ],
      }
    }
  }, [sample, inputSchema])

  const updateSelected = useCallback(
    (updater: (n: SchemaNode) => SchemaNode) => {
      if (!selected) return
      setRoot((r) => updateNode(r, selected.id, updater))
    },
    [selected],
  )

  const handleAddProperty = useCallback(
    (objectId: string, kind: Kind) => {
      const result = addProperty(root, objectId, kind)
      setRoot(result.root)
      setSelectedId(result.newId)
    },
    [root],
  )

  const handleSetArrayItems = useCallback(
    (arrayId: string, kind: Kind) => {
      const result = setArrayItems(root, arrayId, kind)
      setRoot(result.root)
      setSelectedId(result.newId)
    },
    [root],
  )

  const handleRemove = useCallback(
    (id: string) => {
      if (id === root.id) return
      const next = removeNode(root, id)
      setRoot(next)
      if (selectedId === id) setSelectedId(root.id)
    },
    [root, selectedId],
  )

  const handleChangeKind = useCallback(
    (id: string, kind: Kind) => {
      setRoot((r) => replaceNodeKind(r, id, kind))
    },
    [],
  )

  const handleRename = useCallback(
    (objectId: string, oldName: string, newName: string) => {
      setRoot((r) => renameProperty(r, objectId, oldName, newName))
    },
    [],
  )

  const handleSetRequired = useCallback(
    (objectId: string, propName: string, required: boolean) => {
      setRoot((r) => setRequired(r, objectId, propName, required))
    },
    [],
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(outputJson)
      toast.success("Schema copied to clipboard")
    } catch {
      toast.error("Couldn't copy", {
        description: "Browser blocked clipboard access.",
      })
    }
  }, [outputJson])

  const loadPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const built = preset.build()
    setRoot(built.tree)
    setWrapper(built.wrapper)
    setSelectedId(built.tree.id)
    toast.success(`Loaded preset: ${preset.name}`)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-6">
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-sm font-semibold tracking-tight">
            Schema Builder
          </h1>
          <Badge variant="secondary" className="font-mono text-[10px]">
            beta
          </Badge>
          <ToolSwitcher className="ml-2" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="ml-2 h-8 gap-1.5">
                <Sparkles className="size-3.5" />
                Presets
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => loadPreset(p.id)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto flex items-center gap-3">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={wrapper.enabled}
                onCheckedChange={(v) =>
                  setWrapper((w) => ({ ...w, enabled: Boolean(v) }))
                }
              />
              Tool definition wrapper
            </Label>
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link href={useInConfigHref}>
                Use this in a config
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="gap-1.5">
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-4 px-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)_420px]">
        <aside className="rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between px-1.5 text-xs text-muted-foreground">
            <span className="font-medium">Schema tree</span>
            <span className="font-mono">root</span>
          </div>
          <TreeView
            node={root}
            depth={0}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddProperty={handleAddProperty}
            onSetArrayItems={handleSetArrayItems}
            onRemove={handleRemove}
            isRoot
          />
        </aside>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          {wrapper.enabled && (
            <ToolWrapperEditor
              wrapper={wrapper}
              onChange={(patch) => setWrapper((w) => ({ ...w, ...patch }))}
            />
          )}
          {selected ? (
            <NodeEditor
              node={selected}
              parent={parentOfSelected}
              onUpdate={updateSelected}
              onChangeKind={(kind) => handleChangeKind(selected.id, kind)}
              onRenameProperty={(oldName, newName) => {
                if (parentOfSelected?.kind === "object") {
                  handleRename(parentOfSelected.id, oldName, newName)
                }
              }}
              onSetRequired={(propName, required) => {
                if (parentOfSelected?.kind === "object") {
                  handleSetRequired(parentOfSelected.id, propName, required)
                }
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a node in the tree to edit it.
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <PreviewPanel json={outputJson} />
          <SamplePanel
            sample={sample}
            onChange={setSample}
            result={sampleResult}
          />
        </aside>
      </main>
    </div>
  )
}

// ────────────── Tool wrapper editor ──────────────

function ToolWrapperEditor({
  wrapper,
  onChange,
}: {
  wrapper: ToolWrapper
  onChange: (patch: Partial<ToolWrapper>) => void
}) {
  const nameId = useId()
  const descId = useId()
  return (
    <div className="mb-6 space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center gap-2">
        <Boxes className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Tool definition
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <div className="space-y-1.5">
          <Label htmlFor={nameId} className="text-xs">
            Tool name
          </Label>
          <Input
            id={nameId}
            value={wrapper.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="search_files"
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={descId} className="text-xs">
            Description
          </Label>
          <Input
            id={descId}
            value={wrapper.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Search the workspace for files matching a pattern."
          />
        </div>
      </div>
    </div>
  )
}

// ────────────── Tree view ──────────────

interface TreeViewProps {
  node: SchemaNode
  depth: number
  selectedId: string
  onSelect: (id: string) => void
  onAddProperty: (objectId: string, kind: Kind) => void
  onSetArrayItems: (arrayId: string, kind: Kind) => void
  onRemove: (id: string) => void
  isRoot?: boolean
  label?: string
  required?: boolean
}

function TreeView({
  node,
  depth,
  selectedId,
  onSelect,
  onAddProperty,
  onSetArrayItems,
  onRemove,
  isRoot,
  label,
  required,
}: TreeViewProps) {
  const [open, setOpen] = useState(true)
  const Icon = KIND_ICONS[node.kind]
  const isSelected = node.id === selectedId
  const hasChildren =
    (node.kind === "object" && node.properties.length > 0) ||
    (node.kind === "array" && node.items !== null)

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm",
          isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted/40",
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          onClick={() => onSelect(node.id)}
          className="flex flex-1 items-center gap-1.5 truncate text-left"
        >
          <Icon className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-[12px]">
            {label ?? (isRoot ? "root" : "")}
          </span>
          <span className="ml-1 truncate text-[10px] text-muted-foreground">
            {KIND_LABEL[node.kind]}
            {required && (
              <span className="ml-1 text-amber-400">required</span>
            )}
          </span>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {node.kind === "object" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  aria-label="Add property"
                >
                  <Plus className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["string", "number", "boolean", "array", "object", "enum"] as Kind[]).map(
                  (k) => (
                    <DropdownMenuItem
                      key={k}
                      onClick={() => onAddProperty(node.id, k)}
                    >
                      {KIND_LABEL[k]}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {node.kind === "array" && node.items === null && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  aria-label="Set array items"
                >
                  <Plus className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["string", "number", "boolean", "array", "object", "enum"] as Kind[]).map(
                  (k) => (
                    <DropdownMenuItem
                      key={k}
                      onClick={() => onSetArrayItems(node.id, k)}
                    >
                      {KIND_LABEL[k]}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!isRoot && (
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-red-400"
              onClick={() => onRemove(node.id)}
              aria-label="Remove node"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {open && node.kind === "object" && (
        <div>
          {node.properties.map((p) => (
            <TreeView
              key={p.schema.id}
              node={p.schema}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddProperty={onAddProperty}
              onSetArrayItems={onSetArrayItems}
              onRemove={onRemove}
              label={p.name || "(unnamed)"}
              required={p.required}
            />
          ))}
        </div>
      )}
      {open && node.kind === "array" && node.items && (
        <TreeView
          node={node.items}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddProperty={onAddProperty}
          onSetArrayItems={onSetArrayItems}
          onRemove={onRemove}
          label="items"
        />
      )}
    </div>
  )
}

// ────────────── Node editor (kind-dispatched) ──────────────

function NodeEditor({
  node,
  parent,
  onUpdate,
  onChangeKind,
  onRenameProperty,
  onSetRequired,
}: {
  node: SchemaNode
  parent: SchemaNode | null
  onUpdate: (updater: (n: SchemaNode) => SchemaNode) => void
  onChangeKind: (kind: Kind) => void
  onRenameProperty: (oldName: string, newName: string) => void
  onSetRequired: (propName: string, required: boolean) => void
}) {
  const Icon = KIND_ICONS[node.kind]
  const propEntry =
    parent?.kind === "object"
      ? parent.properties.find((p) => p.schema.id === node.id)
      : null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md border border-border/60 bg-muted/30">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium">
            {propEntry ? propEntry.name : "root"}
          </div>
          <div className="text-xs text-muted-foreground">
            {KIND_LABEL[node.kind]}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Label className="flex items-center gap-2 text-xs">
            Type
            <KindSelect value={node.kind} onChange={onChangeKind} />
          </Label>
        </div>
      </div>

      {propEntry && (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">Property name</Label>
            <Input
              value={propEntry.name}
              onChange={(e) =>
                onRenameProperty(propEntry.name, e.target.value)
              }
              placeholder="propertyName"
              className="font-mono"
            />
          </div>
          <Label className="flex items-end gap-2 pb-2 text-xs">
            <Switch
              checked={propEntry.required}
              onCheckedChange={(v) =>
                onSetRequired(propEntry.name, Boolean(v))
              }
            />
            Required
          </Label>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={node.description ?? ""}
          onChange={(e) =>
            onUpdate((n) => ({ ...n, description: e.target.value }))
          }
          placeholder="What this field is for. Shown to the LLM."
          rows={2}
        />
      </div>

      <Separator className="bg-border/60" />

      {node.kind === "string" && <StringFields node={node} onUpdate={onUpdate} />}
      {node.kind === "number" && <NumberFields node={node} onUpdate={onUpdate} />}
      {node.kind === "boolean" && (
        <BooleanFields node={node} onUpdate={onUpdate} />
      )}
      {node.kind === "array" && <ArrayFields node={node} onUpdate={onUpdate} />}
      {node.kind === "object" && <ObjectFields node={node} onUpdate={onUpdate} />}
      {node.kind === "enum" && <EnumFields node={node} onUpdate={onUpdate} />}
    </div>
  )
}

function KindSelect({
  value,
  onChange,
}: {
  value: Kind
  onChange: (kind: Kind) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Kind)}
      className="h-8 rounded-md border border-border/60 bg-card/40 px-2 text-xs"
    >
      {(["string", "number", "boolean", "array", "object", "enum"] as Kind[]).map(
        (k) => (
          <option key={k} value={k}>
            {KIND_LABEL[k]}
          </option>
        ),
      )}
    </select>
  )
}

function StringFields({
  node,
  onUpdate,
}: {
  node: StringNode
  onUpdate: (updater: (n: SchemaNode) => SchemaNode) => void
}) {
  const update = (patch: Partial<StringNode>) =>
    onUpdate((n) => ({ ...(n as StringNode), ...patch }))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Format">
        <select
          value={node.format ?? ""}
          onChange={(e) =>
            update({ format: e.target.value as StringNode["format"] })
          }
          className="h-9 w-full rounded-md border border-border/60 bg-card/40 px-2 text-sm"
        >
          <option value="">none</option>
          <option value="email">email</option>
          <option value="uri">uri</option>
          <option value="date">date</option>
          <option value="date-time">date-time</option>
          <option value="uuid">uuid</option>
          <option value="ipv4">ipv4</option>
        </select>
      </Field>
      <Field label="Pattern (regex)">
        <Input
          value={node.pattern ?? ""}
          onChange={(e) => update({ pattern: e.target.value })}
          placeholder="^[a-z]+$"
          className="font-mono"
        />
      </Field>
      <Field label="Min length">
        <NumInput
          value={node.minLength ?? null}
          onChange={(v) => update({ minLength: v })}
        />
      </Field>
      <Field label="Max length">
        <NumInput
          value={node.maxLength ?? null}
          onChange={(v) => update({ maxLength: v })}
        />
      </Field>
      <Field label="Default" wide>
        <Input
          value={node.default ?? ""}
          onChange={(e) => update({ default: e.target.value })}
          placeholder=""
        />
      </Field>
    </div>
  )
}

function NumberFields({
  node,
  onUpdate,
}: {
  node: NumberNode
  onUpdate: (updater: (n: SchemaNode) => SchemaNode) => void
}) {
  const update = (patch: Partial<NumberNode>) =>
    onUpdate((n) => ({ ...(n as NumberNode), ...patch }))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="" wide>
        <Label className="flex items-center gap-2 text-xs">
          <Switch
            checked={node.integer}
            onCheckedChange={(v) => update({ integer: Boolean(v) })}
          />
          Integer only
        </Label>
      </Field>
      <Field label="Minimum">
        <NumInput
          value={node.minimum ?? null}
          onChange={(v) => update({ minimum: v })}
        />
      </Field>
      <Field label="Maximum">
        <NumInput
          value={node.maximum ?? null}
          onChange={(v) => update({ maximum: v })}
        />
      </Field>
      <Field label="multipleOf">
        <NumInput
          value={node.multipleOf ?? null}
          onChange={(v) => update({ multipleOf: v })}
        />
      </Field>
      <Field label="Default">
        <NumInput
          value={node.default ?? null}
          onChange={(v) => update({ default: v })}
        />
      </Field>
    </div>
  )
}

function BooleanFields({
  node,
  onUpdate,
}: {
  node: BooleanNode
  onUpdate: (updater: (n: SchemaNode) => SchemaNode) => void
}) {
  const update = (patch: Partial<BooleanNode>) =>
    onUpdate((n) => ({ ...(n as BooleanNode), ...patch }))
  return (
    <Field label="Default">
      <select
        value={node.default === true ? "true" : node.default === false ? "false" : ""}
        onChange={(e) => {
          const v = e.target.value
          update({ default: v === "true" ? true : v === "false" ? false : null })
        }}
        className="h-9 w-full rounded-md border border-border/60 bg-card/40 px-2 text-sm"
      >
        <option value="">none</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </Field>
  )
}

function ArrayFields({
  node,
  onUpdate,
}: {
  node: ArrayNode
  onUpdate: (updater: (n: SchemaNode) => SchemaNode) => void
}) {
  const update = (patch: Partial<ArrayNode>) =>
    onUpdate((n) => ({ ...(n as ArrayNode), ...patch }))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Min items">
        <NumInput
          value={node.minItems ?? null}
          onChange={(v) => update({ minItems: v })}
        />
      </Field>
      <Field label="Max items">
        <NumInput
          value={node.maxItems ?? null}
          onChange={(v) => update({ maxItems: v })}
        />
      </Field>
      <div className="sm:col-span-2 rounded-md border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground">
        {node.items
          ? "Item schema is set — select it in the tree to edit."
          : "No item schema yet. Use the + button next to this node in the tree to add one."}
      </div>
    </div>
  )
}

function ObjectFields({
  node,
  onUpdate,
}: {
  node: ObjectNode
  onUpdate: (updater: (n: SchemaNode) => SchemaNode) => void
}) {
  const update = (patch: Partial<ObjectNode>) =>
    onUpdate((n) => ({ ...(n as ObjectNode), ...patch }))
  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2 text-xs">
        <Switch
          checked={node.additionalProperties === false}
          onCheckedChange={(v) =>
            update({ additionalProperties: v ? false : undefined })
          }
        />
        Disallow additional properties
      </Label>
      <p className="text-xs text-muted-foreground">
        {node.properties.length === 0
          ? "Object has no properties yet. Use the + button next to this node in the tree to add one."
          : `${node.properties.length} ${
              node.properties.length === 1 ? "property" : "properties"
            } defined.`}
      </p>
    </div>
  )
}

function EnumFields({
  node,
  onUpdate,
}: {
  node: EnumNode
  onUpdate: (updater: (n: SchemaNode) => SchemaNode) => void
}) {
  const update = (patch: Partial<EnumNode>) =>
    onUpdate((n) => ({ ...(n as EnumNode), ...patch }))

  const setValue = (i: number, v: string) => {
    update({ values: node.values.map((x, idx) => (idx === i ? v : x)) })
  }
  const addValue = () => {
    update({ values: [...node.values, `option-${node.values.length + 1}`] })
  }
  const removeValue = (i: number) => {
    update({ values: node.values.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <Field label="Allowed values" wide>
        <ul className="space-y-1.5">
          {node.values.map((v, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                value={v}
                onChange={(e) => setValue(i, e.target.value)}
                className="font-mono"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeValue(i)}
                aria-label={`Remove value ${v}`}
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="ghost"
          onClick={addValue}
          className="mt-2 h-7 gap-1 text-xs"
        >
          <Plus className="size-3.5" />
          Add value
        </Button>
      </Field>
      <Field label="Default">
        <select
          value={node.default ?? ""}
          onChange={(e) => update({ default: e.target.value || undefined })}
          className="h-9 w-full rounded-md border border-border/60 bg-card/40 px-2 text-sm font-mono"
        >
          <option value="">none</option>
          {node.values.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

function Field({
  label,
  children,
  wide,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      {label && <Label className="text-xs">{label}</Label>}
      {children}
    </div>
  )
}

function NumInput({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <Input
      type="number"
      value={value === null ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === "") onChange(null)
        else {
          const n = Number(raw)
          if (!Number.isNaN(n)) onChange(n)
        }
      }}
      className="font-mono"
    />
  )
}

// ────────────── Right panels ──────────────

function PreviewPanel({ json }: { json: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-red-500/80" />
          <span className="size-2.5 rounded-full bg-yellow-500/80" />
          <span className="size-2.5 rounded-full bg-green-500/80" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            JSON Schema
          </span>
        </div>
      </div>
      <pre className="max-h-[40vh] overflow-auto bg-background/40 p-4 font-mono text-[11px] leading-relaxed">
        {json}
      </pre>
    </div>
  )
}

function SamplePanel({
  sample,
  onChange,
  result,
}: {
  sample: string
  onChange: (v: string) => void
  result: { valid: boolean; errors: { path: string; message: string }[] }
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">
          Test with sample data
        </span>
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
              {result.errors.length}{" "}
              {result.errors.length === 1 ? "error" : "errors"}
            </>
          )}
        </div>
      </div>
      <Textarea
        spellCheck={false}
        value={sample}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-32 resize-none rounded-none border-0 bg-transparent font-mono text-xs leading-relaxed shadow-none focus-visible:ring-0"
      />
      {!result.valid && result.errors.length > 0 && (
        <ul className="space-y-1 border-t border-border/60 bg-red-500/[0.04] px-4 py-3 text-xs">
          {result.errors.slice(0, 8).map((err, i) => (
            <li key={i} className="flex items-start gap-2 text-red-400">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="font-mono">
                <span className="text-red-300">{err.path}</span>: {err.message}
              </span>
            </li>
          ))}
          {result.errors.length > 8 && (
            <li className="text-xs text-muted-foreground">
              + {result.errors.length - 8} more
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
