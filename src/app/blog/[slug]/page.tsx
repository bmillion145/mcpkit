import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"
import rehypeSlug from "rehype-slug"
import type { Pluggable } from "unified"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatDate, getPost, listSlugs, type TocItem } from "@/lib/blog"

export const dynamicParams = false

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  }
}

const mdxOptions = {
  remarkPlugins: [] as Pluggable[],
  rehypePlugins: [
    rehypeSlug,
    [
      rehypePrettyCode,
      {
        theme: "github-dark-dimmed",
        keepBackground: false,
      },
    ],
    [
      rehypeAutolinkHeadings,
      {
        behavior: "wrap",
        properties: {
          className: ["heading-anchor"],
        },
      },
    ],
  ] as Pluggable[],
}

export default async function PostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link href="/blog">
              <ArrowLeft className="size-3.5" />
              All posts
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="truncate text-sm font-semibold tracking-tight">
            {post.title}
          </h1>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article>
          <header className="mb-10 border-b border-border/60 pb-8">
            <div className="mb-3 flex flex-wrap items-baseline gap-3 text-xs text-muted-foreground">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {post.readMinutes} min read
              </span>
              {post.tags && post.tags.length > 0 && (
                <span className="ml-auto flex flex-wrap gap-1">
                  {post.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="rounded-full font-mono text-[10px]"
                    >
                      #{t}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-4 text-balance text-lg text-muted-foreground">
              {post.description}
            </p>
          </header>

          <div className="prose prose-invert prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-pre:rounded-lg prose-pre:border prose-pre:border-border/60 prose-pre:bg-card/40 prose-pre:p-4 prose-code:rounded prose-code:bg-muted/40 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.875em] prose-code:before:content-none prose-code:after:content-none prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0">
            <MDXRemote source={post.body} options={{ mdxOptions }} />
          </div>
        </article>

        <aside className="hidden lg:block">
          {post.toc.length > 0 && (
            <div className="sticky top-20">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              <Toc items={post.toc} />
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

function Toc({ items }: { items: TocItem[] }) {
  return (
    <ul className="space-y-1.5 border-l border-border/60 text-sm">
      {items.map((item, i) => (
        <li key={`${item.slug}-${i}`}>
          <a
            href={`#${item.slug}`}
            className={cn(
              "block border-l-2 border-transparent py-0.5 pl-3 -ml-px text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground",
              item.level === 3 && "pl-6 text-xs",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  )
}
