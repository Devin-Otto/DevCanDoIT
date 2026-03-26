import type { Metadata } from "next";

import { DigitalCard } from "@/components/DigitalCard";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { StructuredData } from "@/components/StructuredData";
import { projects, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Explore DevCanDoIt's portfolio framing for agentic AI systems, web apps, and operations-minded product work."
};

export default function PortfolioPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${siteConfig.name} Portfolio`,
    description:
      "A portfolio of concept-ready builds, solution framing, and technical directions for Devin Otto's full-stack and AI systems work.",
    url: `${siteConfig.siteUrl}/portfolio`
  };

  return (
    <main className="site-shell page-stack">
      <StructuredData data={jsonLd} />

      <section className="page-hero">
        <div className="section-copy">
          <p className="eyebrow">Selected work</p>
          <h1>Real systems, real audiences, and the workflow shape behind each build.</h1>
          <p>
            These entries are framed around the audience, the problem, the solution shape, and the operational
            impact so people can understand not just what was built, but why it matters.
          </p>
        </div>

        <DigitalCard compact />
      </section>

      <section className="section-stack">
        <div className="card-grid-3">
          {projects.map((project) => (
            <article key={project.slug} className="surface-card">
              <div className="project-topline">
                <span className="status-pill subtle">{project.status}</span>
                <span>{project.audience}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.problem}</p>
              <p className="muted">{project.impact}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Browse by angle</p>
          <h2>Sort by AI, operations, or stack alignment.</h2>
          <p>
            This gives you a cleaner way to guide different visitors through the same body of work, whether they
            care about React, Flask, automation, or applied AI systems.
          </p>
        </div>

        <PortfolioGrid />
      </section>
    </main>
  );
}
