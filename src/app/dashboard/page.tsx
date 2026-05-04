import type { Metadata } from "next"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { SignOutButton, UserButton } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const user = await currentUser()
  const displayName =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "there"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-4 px-6">
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-sm font-semibold tracking-tight">Dashboard</h1>
          <Badge variant="secondary" className="font-mono text-[10px]">
            beta
          </Badge>
          <div className="ml-auto" />
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Welcome, {displayName}.
        </h2>
        <p className="mt-4 max-w-prose text-muted-foreground">
          You&apos;re signed in. This is your private dashboard — only the
          authenticated version of you can see it.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Button asChild variant="outline" className="justify-start">
            <Link href="/validator">Open Validator</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/config-generator">Open Config Generator</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/schema-builder">Open Schema Builder</Link>
          </Button>
        </div>

        <div className="mt-12 rounded-xl border border-border/60 bg-card/40 p-6">
          <h3 className="text-sm font-medium">Account</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">Email</dt>
              <dd className="font-mono">
                {user?.primaryEmailAddress?.emailAddress ?? "—"}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs text-muted-foreground">
                {user?.id ?? "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex gap-2">
            <SignOutButton>
              <Button size="sm" variant="ghost">
                Sign out
              </Button>
            </SignOutButton>
          </div>
        </div>
      </main>
    </div>
  )
}
