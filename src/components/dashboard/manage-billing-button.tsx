"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function ManageBillingButton({
  variant = "outline",
}: {
  variant?: "outline" | "default" | "ghost"
}) {
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
    setPending(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null
      if (!res.ok) {
        toast.error(
          data?.error ?? `Couldn't open billing portal (${res.status}).`,
        )
        return
      }
      if (!data?.url) {
        toast.error("Stripe didn't return a portal URL.")
        return
      }
      window.location.href = data.url
    } catch {
      toast.error("Network error.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={handleClick}
      disabled={pending}
      className="gap-1.5"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CreditCard className="size-3.5" />
      )}
      Manage billing
    </Button>
  )
}
