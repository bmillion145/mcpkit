import type { MetadataRoute } from "next"
import { listPosts } from "@/lib/blog"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mcpkit.vercel.app"

const ROUTES: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/validator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/config-generator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/schema-builder", changeFrequency: "weekly", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const staticEntries = ROUTES.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
  const postEntries: MetadataRoute.Sitemap = listPosts().map((post) => ({
    url: new URL(`/blog/${post.slug}`, siteUrl).toString(),
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
  return [...staticEntries, ...postEntries]
}
