import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/portfolio", "/consulting", "/pricing", "/projects", "/resume", "/videos"].map((path) => ({
    url: `${siteConfig.siteUrl}${path}`,
    lastModified: new Date()
  }));
}
