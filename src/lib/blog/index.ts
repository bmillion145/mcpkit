import "server-only"
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import GithubSlugger from "github-slugger"

const POSTS_DIR = path.join(process.cwd(), "src", "content", "blog")

export interface PostFrontmatter {
  title: string
  description: string
  date: string
  tags?: string[]
  draft?: boolean
}

export interface PostMeta extends PostFrontmatter {
  slug: string
  readMinutes: number
}

export interface Post extends PostMeta {
  body: string
  toc: TocItem[]
}

export interface TocItem {
  level: 2 | 3
  text: string
  slug: string
}

function readPostFile(slug: string): { data: PostFrontmatter; content: string } | null {
  const file = path.join(POSTS_DIR, `${slug}.mdx`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, "utf8")
  const { data, content } = matter(raw)
  return {
    data: data as PostFrontmatter,
    content,
  }
}

function countWords(text: string): number {
  return (text.match(/[A-Za-z0-9]+/g) ?? []).length
}

function readMinutes(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200))
}

export function extractToc(content: string): TocItem[] {
  const slugger = new GithubSlugger()
  const items: TocItem[] = []
  let inCodeFence = false

  for (const line of content.split("\n")) {
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence
      continue
    }
    if (inCodeFence) continue
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/)
    if (!m) continue
    const level = m[1].length === 2 ? 2 : 3
    const text = m[2].replace(/`/g, "").trim()
    items.push({
      level,
      text,
      slug: slugger.slug(text),
    })
  }
  return items
}

export function listPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
  const posts: PostMeta[] = []
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "")
    const parsed = readPostFile(slug)
    if (!parsed) continue
    if (parsed.data.draft) continue
    posts.push({
      slug,
      ...parsed.data,
      readMinutes: readMinutes(parsed.content),
    })
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : -1))
  return posts
}

export function getPost(slug: string): Post | null {
  const parsed = readPostFile(slug)
  if (!parsed) return null
  return {
    slug,
    ...parsed.data,
    body: parsed.content,
    toc: extractToc(parsed.content),
    readMinutes: readMinutes(parsed.content),
  }
}

export function listSlugs(): string[] {
  return listPosts().map((p) => p.slug)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
