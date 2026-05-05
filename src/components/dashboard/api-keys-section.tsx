"use client"

import { useState, useTransition } from "react"
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  ShieldX,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  createApiKey,
  revokeApiKey,
} from "@/app/dashboard/actions"

export interface KeyRow {
  id: string
  name: string | null
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export function ApiKeysSection({ keys }: { keys: KeyRow[] }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/40">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="text-base font-medium">API keys</h3>
          <p className="text-xs text-muted-foreground">
            Use these to authenticate against the MCPKit API. Treat them like
            passwords.
          </p>
        </div>
        <CreateKeyDialog />
      </header>

      {keys.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted-foreground">
          No keys yet. Create one to start calling the API.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {keys.map((k) => (
            <KeyRow key={k.id} row={k} />
          ))}
        </ul>
      )}
    </section>
  )
}

function KeyRow({ row }: { row: KeyRow }) {
  const [pending, startTransition] = useTransition()
  const isRevoked = row.revokedAt !== null

  const handleRevoke = () => {
    startTransition(async () => {
      const fd = new FormData()
      fd.append("id", row.id)
      const result = await revokeApiKey(fd)
      if (!result.ok) {
        toast.error("Couldn't revoke key", { description: result.error })
      } else {
        toast.success("Key revoked")
      }
    })
  }

  return (
    <li
      className={cn(
        "flex items-center gap-4 px-5 py-4",
        isRevoked && "opacity-60",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30">
        {isRevoked ? (
          <ShieldX className="size-4 text-muted-foreground" />
        ) : (
          <KeyRound className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {row.name ?? "(unnamed)"}
          </span>
          {isRevoked && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              Revoked
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono">{row.keyPrefix}…</span>
          <span>created {formatDate(row.createdAt)}</span>
          <span>
            last used{" "}
            {row.lastUsedAt ? formatRelative(row.lastUsedAt) : "never"}
          </span>
        </div>
      </div>
      {!isRevoked && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRevoke}
          disabled={pending}
          className="gap-1.5 text-muted-foreground hover:text-red-400"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Revoke
        </Button>
      )}
    </li>
  )
}

function CreateKeyDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setName("")
    setCreatedKey(null)
    setCopied(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      // Slight delay so the closing animation isn't jarring.
      window.setTimeout(reset, 150)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const fd = new FormData()
      fd.append("name", name)
      const result = await createApiKey(fd)
      if (!result.ok) {
        toast.error("Couldn't create key", { description: result.error })
        return
      }
      setCreatedKey(result.key)
    })
  }

  const handleCopy = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      toast.success("Copied to clipboard")
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          Create key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create a new API key</DialogTitle>
              <DialogDescription>
                Give it a name so you can recognize it later. The key itself is
                generated server-side.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production server"
                  maxLength={80}
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending || name.trim().length === 0}
                  className="gap-1.5"
                >
                  {pending && <Loader2 className="size-3.5 animate-spin" />}
                  Create key
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Save this key now</DialogTitle>
              <DialogDescription>
                This is the only time you&apos;ll see it. We only store a hash
                — there&apos;s no way to recover it if you lose it.
              </DialogDescription>
            </DialogHeader>
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-200">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-amber-200">
                Treat this like a password. Anyone with it can call the MCPKit
                API as you.
              </AlertDescription>
            </Alert>
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-sm break-all">
              {createdKey}
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy to clipboard"}
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                I&apos;ve saved it
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const diffMs = Date.now() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "just now"
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  const days = Math.floor(sec / 86400)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}
