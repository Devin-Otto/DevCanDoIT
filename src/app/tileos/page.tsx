import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppProjectDetailView } from "@/components/AppProjectDetailView";
import { getAppProject, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "TileOS",
  description:
    "TileOS is the live public portfolio lab inside DevCanDoIt, where visitors can generate app drafts and explore the curated showcase."
};

export default function TileOSPage() {
  const tileOSProject = getAppProject("tileos");

  if (!tileOSProject) {
    notFound();
  }

  return (
    <AppProjectDetailView
      project={tileOSProject}
      hostedView
      canonicalUrl={`${siteConfig.siteUrl}/tileos`}
      primaryHref="/tileos/app"
      primaryLabel="Open full TileOS"
    >
      <section className="site-shell tileos-showcase">
        <div className="surface-card tileos-showcase__frame">
          <div className="tileos-showcase__toolbar">
            <div className="tileos-showcase__traffic" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="tileos-showcase__address">devcandoit.com/tileos/app</div>
          </div>
          <iframe
            className="tileos-showcase__iframe"
            title="TileOS live app"
            src="/tileos/app"
            loading="eager"
            allow="microphone; clipboard-read; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </section>
    </AppProjectDetailView>
  );
}
