import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { AppProjectDetailView } from "@/components/AppProjectDetailView";
import { DigitalCard } from "@/components/DigitalCard";
import { HeroComposer } from "@/components/HeroComposer";
import { LeadForm } from "@/components/LeadForm";
import { StructuredData } from "@/components/StructuredData";
import { faqs, getAppProject, industries, isTileOSHost, proofPoints, projects, services, siteConfig } from "@/lib/site";

const engagementSteps = [
  {
    title: "Diagnose the bottleneck",
    body: "Start from the actual handoff, intake, or reporting problem that keeps costing time."
  },
  {
    title: "Map the workflow",
    body: "Translate the process into interfaces, data flow, and a practical system shape."
  },
  {
    title: "Build the proof",
    body: "Ship a working slice that shows the team the idea in motion instead of on a slide."
  },
  {
    title: "Refine for handoff",
    body: "Tighten the UX, guardrails, and implementation path so the system can keep running."
  }
];

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");

  if (isTileOSHost(requestHost)) {
    const tileOSProject = getAppProject("tileos");
    return {
      title: tileOSProject?.title || "TileOS",
      description: tileOSProject?.summary || "TileOS inside DevCanDoIt."
    };
  }

  return {
    title: "Portfolio and AI consulting for systems that feel real in the room",
    description:
      "DevCanDoIt helps businesses and hiring teams see Devin Otto's work through portfolio storytelling, consulting offers, and product-ready system framing."
  };
}

export default async function HomePage() {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const tileOSProject = getAppProject("tileos");

  if (isTileOSHost(requestHost) && tileOSProject) {
    return <AppProjectDetailView project={tileOSProject} hostedView />;
  }

  const tileOSLiveHref =
    tileOSProject && "liveHref" in tileOSProject && typeof tileOSProject.liveHref === "string"
      ? tileOSProject.liveHref
      : null;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: siteConfig.owner,
      jobTitle: siteConfig.title,
      email: siteConfig.email,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Torrance",
        addressRegion: "CA",
        addressCountry: "US"
      },
      worksFor: {
        "@type": "Organization",
        name: siteConfig.name
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: siteConfig.name,
      areaServed: "United States",
      founder: siteConfig.owner,
      serviceType: [
        "Agentic AI consulting",
        "Custom web app development",
        "Workflow automation"
      ],
      description: siteConfig.summary,
      email: siteConfig.email,
      url: siteConfig.siteUrl
    }
  ];

  return (
    <main>
      <StructuredData data={structuredData} />

      <HeroComposer />

      <section className="site-shell section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Selected work</p>
          <h2>Proof that looks like software teams can actually use.</h2>
          <p>
            Each card shows the audience, the problem, the solution shape, and the operational impact so visitors
            can evaluate the work quickly.
          </p>
        </div>

        <div className="card-grid-3">
          {projects.map((project) => (
            <article key={project.slug} className="surface-card">
              <div className="project-topline">
                <span className="status-pill subtle">{project.status}</span>
                <span>{project.audience}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <div className="project-split">
                <div>
                  <span className="metric-label">Problem</span>
                  <p>{project.problem}</p>
                </div>
                <div>
                  <span className="metric-label">Impact</span>
                  <p>{project.impact}</p>
                </div>
              </div>
              <div className="tag-row">
                {project.stack.map((item) => (
                  <span key={item} className="tag">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="button-row center">
          <Link className="button" href="/portfolio">
            View selected work
          </Link>
          {tileOSLiveHref ? (
            <Link className="button button-ghost" href={tileOSLiveHref}>
              Launch TileOS
            </Link>
          ) : null}
        </div>
      </section>

      <section className="site-shell split-section">
        <div className="section-copy">
          <p className="eyebrow">What I build</p>
          <h2>Internal tools, workflow systems, and AI features that reduce manual work.</h2>
          <p>
            Use this when a team needs software that is practical enough for operations and polished enough to feel
            confident in front of clients, staff, or leadership.
          </p>
        </div>

        <div className="stacked-cards">
          {services.map((service) => (
            <article key={service.title} className="surface-card">
              <h3>{service.title}</h3>
              <p>{service.summary}</p>
              <ul className="simple-list">
                {service.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell split-section reverse">
        <div className="section-copy">
          <p className="eyebrow">How engagements work</p>
          <h2>Diagnose the bottleneck, shape the workflow, then build the proof.</h2>
          <p>
            This keeps the process simple to scope and specific enough that clients know what happens after the
            first call.
          </p>
        </div>

        <div className="stacked-cards">
          {engagementSteps.map((step, index) => (
            <article key={step.title} className="surface-card">
              <span className="metric-label">Step {index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell consultation-band">
        <div>
          <p className="eyebrow">Two paths</p>
          <h2>Use the site to hire Devin or browse the selected work.</h2>
          <p>
            One route is for teams that need a workflow system built. The other is for hiring managers and
            collaborators who want to understand the product and engineering depth.
          </p>
        </div>

        <div className="button-row">
          <Link className="button" href="/consulting">
            Hire Devin
          </Link>
          <Link className="button button-ghost" href="/portfolio">
            View selected work
          </Link>
        </div>
      </section>

      <section className="site-shell split-section">
        <div className="section-copy">
          <p className="eyebrow">Best fit</p>
          <h2>Teams with messy handoffs, repeated questions, or spreadsheet-driven work.</h2>
          <p>
            These are framed as practical business problems instead of buzzwords so owners, operators, and hiring
            teams can recognize themselves immediately.
          </p>
        </div>

        <div className="stacked-cards">
          {industries.map((industry) => (
            <article key={industry.name} className="surface-card">
              <h3>{industry.name}</h3>
              <p>{industry.fit}</p>
              <p className="muted">{industry.why}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell split-section reverse">
        <div className="stacked-cards">
          {proofPoints.map((point) => (
            <article key={point.title} className="surface-card">
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </article>
          ))}
        </div>

        <div className="section-copy">
          <p className="eyebrow">Why teams hire me</p>
          <h2>Strategy, product framing, and implementation in one lane.</h2>
          <p>
            The goal is to make prospects feel the combination of operational thinking, product instinct, and build
            depth that does not come through in source code alone.
          </p>
          <div className="tag-row">
            {siteConfig.valuePillars.map((item) => (
              <span key={item} className="tag">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="site-shell contact-section">
        <LeadForm />

        <div className="contact-sidebar">
          <DigitalCard compact />
          <article className="surface-card">
            <p className="eyebrow">What happens next</p>
            <h3>Tagged email delivery</h3>
            <p>
              Contact form messages route to <strong>{siteConfig.email}</strong> with the subject tag{" "}
              <strong>{siteConfig.contactTag}</strong> so you can filter inquiries later.
            </p>
          </article>
        </div>
      </section>

      <section className="site-shell faq-grid">
        {faqs.map((item) => (
          <article key={item.question} className="surface-card">
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
