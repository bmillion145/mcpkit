import Link from "next/link"
import { Show, SignInButton, UserButton } from "@clerk/nextjs"
import {
  ArrowRight,
  Boxes,
  Braces,
  Bug,
  Check,
  FileWarning,
  GitBranch,
  Plug,
  Terminal,
  Variable,
  Webhook,
  Wrench,
  Zap,
} from "lucide-react"

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ValidatorDemo } from "@/components/validator-demo"

const NAV_LINKS = [
  { label: "Validator", href: "#validator" },
  { label: "Config Generator", href: "#tools" },
  { label: "Schema Builder", href: "#tools" },
  { label: "API", href: "#api" },
  { label: "Docs", href: "/docs" },
]

const ERRORS = [
  {
    icon: Plug,
    title: "Invalid transport",
    desc: "stdio servers without a command, sse servers without a url.",
  },
  {
    icon: FileWarning,
    title: "Missing required fields",
    desc: "name, command, args — the basics that fail silently in the host.",
  },
  {
    icon: Braces,
    title: "Malformed tool schemas",
    desc: "JSON Schema that doesn't validate against the MCP spec.",
  },
  {
    icon: Variable,
    title: "Env var typos",
    desc: "References to env vars that the host won't ever pass through.",
  },
  {
    icon: GitBranch,
    title: "Version mismatches",
    desc: "Protocol versions your client and server disagree on.",
  },
  {
    icon: Bug,
    title: "Broken JSON",
    desc: "Trailing commas, smart quotes, the usual config-file landmines.",
  },
]

const TOOLS = [
  {
    icon: Terminal,
    title: "Validator",
    desc: "Paste your config or point us at a server. Get pinpoint errors with line numbers, not stack traces.",
  },
  {
    icon: Wrench,
    title: "Config Generator",
    desc: "Pick servers, fill the gaps, copy the JSON. Works with Claude Desktop, Cursor, Zed, and friends.",
  },
  {
    icon: Boxes,
    title: "Schema Builder",
    desc: "Author tool schemas in a typed editor with live JSON Schema preview and inline validation.",
  },
]

const API_FEATURES = [
  "CI/CD validation endpoint",
  "GitHub Action — fail PRs on bad configs",
  "10,000 requests / month",
  "Webhook alerts on schema drift",
]

const FOOTER_LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "Docs", href: "/docs" },
  { label: "GitHub", href: "https://github.com/bmillion145/mcpkit" },
  { label: "Twitter", href: "https://twitter.com" },
  { label: "Status", href: "/status" },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <span className="font-mono text-sm font-bold">M</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">MCPKit</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button size="sm" variant="ghost">
                  Sign In
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserButton
                appearance={{
                  elements: { avatarBox: "size-8" },
                }}
              />
            </Show>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/40">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(120,119,198,0.18),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
          />
          <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center sm:pt-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Built for MCP developers
            </div>
            <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
              Stop debugging MCP configs at midnight
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              Validate servers, generate configs, and build tool schemas in
              seconds. Free in your browser, paid via API.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="#validator">
                  Validate a Server
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link
                  href="https://github.com/bmillion145/mcpkit"
                  target="_blank"
                  rel="noopener"
                >
                  <GithubIcon className="mr-1 size-4" />
                  View on GitHub
                </Link>
              </Button>
            </div>
            <div id="validator" className="mt-16 scroll-mt-24">
              <ValidatorDemo />
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Edit the config above — validation runs live in your browser.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border/40">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                What it catches
              </h2>
              <p className="mt-4 text-muted-foreground">
                The MCP errors that send you spelunking through host logs at
                2am.
              </p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
              {ERRORS.map((e) => (
                <div
                  key={e.title}
                  className="bg-card/60 p-6 transition-colors hover:bg-card"
                >
                  <e.icon className="size-5 text-muted-foreground" />
                  <h3 className="mt-5 text-base font-medium">{e.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {e.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tools" className="border-b border-border/40 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Three tools, one site
              </h2>
              <p className="mt-4 text-muted-foreground">
                Everything you need to build an MCP server, free and in the
                browser.
              </p>
            </div>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <Card
                  key={tool.title}
                  className="overflow-hidden border-border/60 bg-card/60 transition-colors hover:border-border"
                >
                  <div className="relative aspect-video overflow-hidden border-b border-border/60 bg-muted/30">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex size-14 items-center justify-center rounded-xl border border-border/60 bg-card/80 backdrop-blur">
                        <tool.icon className="size-6 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {tool.desc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href="#"
                      className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
                    >
                      Try it free
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="api" className="border-b border-border/40 scroll-mt-24">
          <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(120,119,198,0.15),transparent_50%)]"
              />
              <div className="relative grid gap-12 p-8 sm:p-12 lg:grid-cols-2 lg:p-14">
                <div>
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1 font-mono text-xs"
                  >
                    $19/mo
                  </Badge>
                  <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                    For teams shipping MCP servers
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Run validation in CI, gate PRs on schema correctness, and
                    catch drift before it reaches production. Same engine as the
                    free tools, exposed as an API.
                  </p>
                  <Button size="lg" className="mt-8">
                    Get API Access
                    <ArrowRight className="ml-1 size-4" />
                  </Button>
                </div>
                <div>
                  <ul className="space-y-4">
                    {API_FEATURES.map((feature, i) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check className="size-3" strokeWidth={3} />
                        </div>
                        <span>{feature}</span>
                        {i === 1 && (
                          <Webhook className="ml-auto size-4 text-muted-foreground/40" />
                        )}
                        {i === 0 && (
                          <Zap className="ml-auto size-4 text-muted-foreground/40" />
                        )}
                      </li>
                    ))}
                  </ul>
                  <Separator className="my-6 bg-border/60" />
                  <p className="font-mono text-xs text-muted-foreground">
                    POST /v1/validate
                    <br />
                    <span className="text-muted-foreground/60">
                      Authorization: Bearer mk_live_…
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} MCPKit. All rights reserved.</p>
            <nav className="flex gap-6">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
