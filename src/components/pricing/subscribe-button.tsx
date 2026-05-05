"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { PlanId } from "@/lib/api/plans"

export function SubscribeButton({
  planId,
  highlight,
  children,
}: {
  planId: PlanId
  highlight?: boolean
  children: React.ReactNode
}) {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push(`/?from=pricing-${planId}`)
      // The user can sign in via the modal in the header. For a smoother
      // flow we could open the SignInButton modal directly; this is fine v1.
      toast.info("Sign in to subscribe")
      return
    }

    setPending(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null
      if (!res.ok) {
        toast.error(
          data?.error ?? `Checkout failed (${res.status}).`,
        )
        return
      }
      if (!data?.url) {
        toast.error("Stripe didn't return a checkout URL.")
        return
      }
      window.location.href = data.url
    } catch {
      toast.error("Network error while contacting checkout.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      size="lg"
      variant={highlight ? "default" : "outline"}
      onClick={handleClick}
      disabled={pending || !isLoaded}
      className="w-full gap-1.5"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  )
}
