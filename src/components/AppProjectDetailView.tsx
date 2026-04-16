import type { ReactNode } from "react";
import Link from "next/link";

import { StructuredData } from "@/components/StructuredData";
import { siteConfig } from "@/lib/site";

type AppProject = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  goal: string;
  stack: readonly string[];
  status: string;
  nextStep: string;
  liveHref?: string;
};

type AppProjectDetailViewProps = {
  project: AppProject;
  hostedView?: boolean;
  canonicalUrl?: string;
  primaryHref?: string;
  primaryLabel?: string;
  children?: ReactNode;
};

export function AppProjectDetailView({
  project,
  hostedView = false,
  canonicalUrl,
  primaryHref,
  primaryLabel,
  children
}: AppProjectDetailViewProps) {
  const liveHref = typeof project.liveHref === "string" ? project.liveHref : undefined;
  const isTileOS = project.slug === "tileos";
  const resolvedPrimaryHref =
    primaryHref || (hostedView ? liveHref || siteConfig.siteUrl : liveHref);
  const resolvedPrimaryLabel =
    primaryLabel ||
    (hostedView ? (isTileOS ? "Open project" : `Open ${project.title}`) : isTileOS ? "Open project" : "Launch live app");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: canonicalUrl || `${siteConfig.siteUrl}/projects/${project.slug}`,
  };

  return (
    <main className="site-shell page-stack">
      <StructuredData data={jsonLd} />

      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">{hostedView ? (isTileOS ? "Open project" : "Live app") : "Project"}</p>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          {isTileOS ? (
            <p className="muted">
              TileOS is a portfolio workspace inside DevCanDoIt. Visitors can generate app drafts in their own
              workspace, while admin controls decide which finished tiles get promoted into the shared showcase.
            </p>
          ) : null}
          <div className="tag-row">
            <span className="tag">{project.category}</span>
            <span className="tag">{project.status}</span>
          </div>
        </div>
      </section>

      <section className="split-section">
        <div className="stacked-cards">
          <article className="surface-card">
            <span className="metric-label">Goal</span>
            <p>{project.goal}</p>
          </article>
          <article className="surface-card">
            <span className="metric-label">Next step</span>
            <p>{project.nextStep}</p>
          </article>
        </div>

        <div className="surface-card">
          <p className="eyebrow">Stack</p>
          <div className="tag-row">
            {project.stack.map((item) => (
              <span key={item} className="tag">
                {item}
              </span>
            ))}
          </div>
          <p className="muted">
            {isTileOS
              ? "The public portfolio links directly into the TileOS workspace. Draft generation stays scoped to the project, while publish, unpublish, delete, and showcase ordering stay under admin control."
              : "This page is set up so the project can become a hosted, fully functional app when the implementation is ready."}
          </p>
          <div className="button-row">
            {resolvedPrimaryHref ? (
              <Link className="button" href={resolvedPrimaryHref}>
                {resolvedPrimaryLabel}
              </Link>
            ) : null}
            <Link className={hostedView || liveHref ? "button button-ghost" : "button"} href="/projects">
              {hostedView ? "Browse projects" : "Back to projects"}
            </Link>
          </div>
        </div>
      </section>

      {children}
    </main>
  );
}
