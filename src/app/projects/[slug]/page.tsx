import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/StructuredData";
import { appProjects, siteConfig } from "@/lib/site";

type ProjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getProject(slug: string) {
  return appProjects.find((project) => project.slug === slug);
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return {
      title: "Project not found"
    };
  }

  return {
    title: project.title,
    description: project.summary
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    notFound();
  }

  const liveHref = "liveHref" in project && typeof project.liveHref === "string" ? project.liveHref : undefined;
  const isTileOS = project.slug === "tileos";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: `${siteConfig.siteUrl}/projects/${project.slug}`
  };

  return (
    <main className="site-shell page-stack">
      <StructuredData data={jsonLd} />

      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Project</p>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          {isTileOS ? (
            <p className="muted">
              TileOS is the live public portfolio lab. Visitors can generate app drafts in their own workspace, while
              admin controls decide which finished tiles get promoted into the shared showcase.
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
              ? "The public portfolio links directly into the live TileOS runtime. Draft generation is public, while publish, unpublish, delete, and showcase ordering stay under admin control."
              : "This page is set up so the project can become a hosted, fully functional app when the implementation is ready."}
          </p>
          <div className="button-row">
            {liveHref ? (
              <Link className="button" href={liveHref}>
                {isTileOS ? "Launch TileOS" : "Launch live app"}
              </Link>
            ) : null}
            <Link className={liveHref ? "button button-ghost" : "button"} href="/projects">
              Back to projects
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
