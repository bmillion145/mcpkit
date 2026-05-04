import { ImageResponse } from "next/og"
import { getPost, listSlugs } from "@/lib/blog"

export const alt = "MCPKit blog post"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }))
}

export default async function OpenGraphImage(
  { params }: { params: { slug: string } },
) {
  const post = getPost(params.slug)
  const title = post?.title ?? "MCPKit"
  const description =
    post?.description ?? "Free MCP server validator and config tools."
  const date = post
    ? new Date(post.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : ""
  const readMinutes = post?.readMinutes
  const siteHost = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mcpkit.vercel.app"
  ).replace(/^https?:\/\//, "")

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #0b1020 0%, #111827 60%, #0b1020 100%)",
          color: "#e2e8f0",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "22px",
            color: "#94a3b8",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#e2e8f0",
              color: "#0b1020",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontFamily: "monospace",
              fontSize: 22,
            }}
          >
            M
          </div>
          <span style={{ fontWeight: 600, color: "#f1f5f9" }}>MCPKit</span>
          <span>·</span>
          <span>Blog</span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#f8fafc",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              lineHeight: 1.35,
              color: "#cbd5e1",
              maxWidth: 1000,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          {date && <span>{date}</span>}
          {readMinutes != null && (
            <>
              <span>·</span>
              <span>{readMinutes} min read</span>
            </>
          )}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "monospace",
              color: "#64748b",
            }}
          >
            {siteHost}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
