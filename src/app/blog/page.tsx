import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatDate, listPosts } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes from the team building MCPKit — debugging tips, validator deep-dives, and product updates.",
  openGraph: {
    title: "MCPKit Blog",
    description:
      "Notes from the team building MCPKit — debugging tips, validator deep-dives, and product updates.",
  },
}

export default function BlogIndexPage() {
  const posts = listPosts()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-4 px-6">
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-sm font-semibold tracking-tight">Blog</h1>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-14 max-w-2xl">
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Notes from the team
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Debugging tips, validator deep-dives, and product updates from the
            people building MCPKit.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
            No posts yet — check back soon.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block py-8 transition-colors hover:bg-muted/20 sm:rounded-lg sm:px-3"
                >
                  <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {post.readMinutes} min read
                    </span>
                    {post.tags && post.tags.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono">
                          {post.tags.map((t) => `#${t}`).join(" ")}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-2 text-balance text-2xl font-semibold tracking-tight transition-colors group-hover:text-foreground">
                    {post.title}
                    <ArrowUpRight className="ml-1 inline-block size-4 -translate-y-0.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </h3>
                  <p className="mt-2 text-balance text-muted-foreground">
                    {post.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
