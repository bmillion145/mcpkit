"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Boxes, FileCheck2, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

const TOOLS = [
  { href: "/validator", label: "Validator", icon: FileCheck2 },
  { href: "/config-generator", label: "Config Generator", icon: Wrench },
  { href: "/schema-builder", label: "Schema Builder", icon: Boxes },
]

export function ToolSwitcher({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="MCPKit tools"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/40 p-0.5",
        className,
      )}
    >
      {TOOLS.map((t) => {
        const active = pathname === t.href || pathname?.startsWith(t.href + "/")
        const Icon = t.icon
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
