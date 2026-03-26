import type { Metadata } from "next";

import { LeadForm } from "@/components/LeadForm";
import { StructuredData } from "@/components/StructuredData";
import DatabaseWithRestApi from "@/components/ui/database-with-rest-api";
import { consultingOffers, industries, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Consulting",
  description:
    "DevCanDoIt consulting for agentic AI systems, custom web apps, workflow automation, and practical operational product thinking."
};

const processSteps = [
  {
    title: "Find the friction",
    body: "Start from the actual bottleneck, not the trend cycle. We identify what is slow, confusing, or expensive."
  },
  {
    title: "Shape the system",
    body: "Map the people, interfaces, and automation layers so the product idea solves a real workflow."
  },
  {
    title: "Build the proof",
    body: "Turn the strongest opportunity into a prototype, internal tool, or delivery plan that is ready for action."
  }
];

export default function ConsultingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    provider: {
      "@type": "Organization",
      name: siteConfig.name
    },
    serviceType: "Agentic AI consulting",
    areaServed: "United States",
    description:
      "Consulting for agentic AI systems, automation strategy, and product implementation for teams that need practical workflow improvements."
  };

  return (
    <main className="site-shell page-stack">
      <StructuredData data={jsonLd} />

      <section className="page-hero">
        <div className="section-copy">
          <p className="eyebrow">Consulting</p>
          <h1>Consulting for teams that need workflow systems, not abstract AI advice.</h1>
          <p>
            DevCanDoIt is positioned for owners, operators, and lean teams that need practical help with agentic AI,
            workflow automation, and custom internal software.
          </p>
        </div>

        <aside className="surface-card consulting-database-card">
          <div className="section-copy">
            <p className="eyebrow">System pattern</p>
            <h2>API-first workflows that move data without breaking the human side.</h2>
            <p className="muted">
              A visual cue for the way consulting projects often work here: lightweight interfaces on top, structured
              data movement underneath.
            </p>
          </div>
          <DatabaseWithRestApi
            circleText="REST"
            title="Data exchange using a customized REST API"
            badgeTexts={{ first: "GET", second: "POST", third: "PUT", fourth: "DELETE" }}
            buttonTexts={{ first: "LegionDev", second: "v2_updates" }}
            lightColor="#9bc3ff"
          />
        </aside>
      </section>

      <section className="section-stack">
        <div className="card-grid-3">
          {consultingOffers.map((offer) => (
            <article key={offer.title} className="surface-card">
              <div className="project-topline">
                <span className="status-pill subtle">{offer.length}</span>
                <span>{offer.price}</span>
              </div>
              <h3>{offer.title}</h3>
              <p>{offer.summary}</p>
              <ul className="simple-list">
                {offer.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="split-section">
        <div className="section-copy">
          <p className="eyebrow">How engagements work</p>
          <h2>Strategy, product framing, and implementation in one lane.</h2>
          <p>
            You can use these offers for discovery calls, consulting packages, or as the narrative structure behind
            a more custom engagement.
          </p>
        </div>

        <div className="stacked-cards">
          {processSteps.map((step, index) => (
            <article key={step.title} className="surface-card">
              <span className="metric-label">Step {index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-stack">
        <div className="section-copy section-intro">
          <p className="eyebrow">Industry examples</p>
          <h2>Lead with concrete scenarios people recognize.</h2>
          <p>
            This makes it easier for prospects to see themselves in the work instead of trying to decode generic AI
            consulting language.
          </p>
        </div>

        <div className="card-grid-3">
          {industries.map((industry) => (
            <article key={industry.name} className="surface-card">
              <h3>{industry.name}</h3>
              <p>{industry.fit}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="contact-section">
        <LeadForm context="Consulting inquiry" />
      </section>
    </main>
  );
}
