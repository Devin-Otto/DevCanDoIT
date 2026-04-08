import type { Metadata } from "next";

import { StructuredData } from "@/components/StructuredData";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { appProjects, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description: "A scrollable showcase of Devin Otto's app concepts and live product ideas."
};

function buildStackDistribution() {
  const counts = new Map<string, number>();

  for (const project of appProjects) {
    for (const skill of project.stack) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export default function ProjectsPage() {
  const stackDistribution = buildStackDistribution();
  const maxCount = Math.max(...stackDistribution.map((item) => item.count), 1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${siteConfig.name} Projects`,
    description: "Scrollable showcase of app concepts, tools, and product ideas from Devin Otto.",
    url: `${siteConfig.siteUrl}/projects`
  };

  return (
    <main className="site-shell page-stack projects-page">
      <StructuredData data={jsonLd} />

      <section className="page-hero projects-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Projects</p>
          <h1>Scrollable app concepts, product ideas, and systems I want to host live.</h1>
          <p>
            Navigate the carousel for some of the projects i have been working on.
          </p>
          <p className="muted">{appProjects.length} projects in the carousel</p>
          <div className="projects-cta-row">
            <a className="button" href="#projects-carousel">
              Take a look at my projects!
            </a>
          </div>
        </div>

        <div className="surface-card projects-launcher">
          <div className="projects-launcher-stage" aria-hidden="true">
            <WebGLShader className="projects-launcher-canvas" />
            <div className="projects-launcher-overlay" />
          </div>
          <div className="projects-launcher-copy">
            <p className="eyebrow">Live visual system</p>
            <h2>Shader-driven motion for the project launcher.</h2>
            <p className="muted">
              A visual teaser for the browsable product launcher, designed to sit above the carousel without pushing it
              out of view.
            </p>
          </div>
        </div>
      </section>

      <section id="projects-carousel" className="projects-carousel" aria-label="Project showcase carousel">
        {appProjects.map((project, index) => {
          const liveHref = "liveHref" in project && typeof project.liveHref === "string" ? project.liveHref : undefined;

          return (
          <article key={project.slug} className="surface-card project-carousel-card">
            <div className="project-carousel-topline">
              <span className="status-pill subtle">{project.status}</span>
              <span>#{index + 1}</span>
            </div>
            <p className="metric-label">{project.category}</p>
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <div className="project-split">
              <div>
                <span className="metric-label">Goal</span>
                <p>{project.goal}</p>
              </div>
              <div>
                <span className="metric-label">Next step</span>
                <p>{project.nextStep}</p>
              </div>
            </div>
            <div className="tag-row">
              {project.stack.map((item) => (
                <span key={item} className="tag">
                  {item}
                </span>
              ))}
            </div>
            <div className="button-row">
              {liveHref ? (
                <a className="button" href={liveHref}>
                  Open live app
                </a>
              ) : null}
              <a className={liveHref ? "button button-ghost" : "button"} href={`/projects/${project.slug}`}>
                Open project
              </a>
            </div>
          </article>
          );
        })}
      </section>

      <section className="surface-card projects-stack-card">
        <div className="section-copy">
          <p className="eyebrow">Favored stack</p>
          <h2>Where your project ideas cluster overall.</h2>
          <p>
            Each project contributes one point to every skill tag it uses, so you can see the distribution of the
            tools and workflows that show up most often across the portfolio.
          </p>
        </div>

        <div className="projects-chart" role="list" aria-label="Distribution of tagged skills across projects">
          {stackDistribution.map((item) => (
            <div key={item.label} className="projects-chart-row" role="listitem">
              <div className="projects-chart-labels">
                <strong>{item.label}</strong>
                <span>{item.count} project{item.count === 1 ? "" : "s"}</span>
              </div>
              <div className="projects-chart-track" aria-hidden="true">
                <div
                  className="projects-chart-fill"
                  style={{ width: `${Math.max((item.count / maxCount) * 100, 8)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
