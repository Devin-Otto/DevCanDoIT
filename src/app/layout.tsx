import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site";

import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "DevCanDoIt | Agentic AI consulting, portfolio, and product builds",
    template: "%s | DevCanDoIt"
  },
  description:
    "DevCanDoIt is Devin Otto's portfolio and consulting site for agentic AI systems, custom web apps, and operational workflow design.",
  applicationName: siteConfig.name,
  keywords: [
    "agentic ai consultant",
    "generative ai consultant",
    "React TypeScript portfolio",
    "Flask Gunicorn developer",
    "AI systems consultant",
    "inventory system consultant"
  ],
  authors: [{ name: siteConfig.owner }],
  creator: siteConfig.owner,
  openGraph: {
    title: "DevCanDoIt",
    description:
      "Portfolio, consulting, and product framing for Devin Otto's agentic AI and full-stack work.",
    url: siteConfig.siteUrl,
    siteName: siteConfig.name,
    images: [
      {
        url: "/logo-var-lif.jpg",
        width: 2240,
        height: 1920,
        alt: "DevCanDoIt logo illustration"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "DevCanDoIt",
    description: "Agentic AI consulting, full-stack builds, and portfolio storytelling.",
    images: ["/logo-var-lif.jpg"]
  }
};

export const viewport: Viewport = {
  themeColor: "#08090d"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="page-bg" />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
