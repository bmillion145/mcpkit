import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mcpkit.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MCPKit — Validate and debug MCP servers",
    template: "%s | MCPKit",
  },
  description:
    "Free MCP server validator, config generator, and tool schema builder. Built for developers shipping Model Context Protocol integrations.",
  applicationName: "MCPKit",
  keywords: [
    "MCP",
    "Model Context Protocol",
    "MCP validator",
    "MCP config",
    "tool schema",
    "Claude",
    "Anthropic",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "MCPKit",
    title: "MCPKit — Validate and debug MCP servers",
    description:
      "Free MCP server validator, config generator, and tool schema builder. Built for developers shipping Model Context Protocol integrations.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MCPKit — Validate and debug MCP servers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MCPKit — Validate and debug MCP servers",
    description:
      "Free MCP server validator, config generator, and tool schema builder. Built for developers shipping Model Context Protocol integrations.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster theme="dark" />
        </body>
      </html>
    </ClerkProvider>
  );
}
