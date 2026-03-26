import type { Metadata } from "next";

import { StructuredData } from "@/components/StructuredData";
import { PricingCards } from "@/components/PricingCards";
import { pricingPlans, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent pricing for consulting sprints, prototype builds, and ongoing implementation support.",
};

export default function PricingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${siteConfig.name} Pricing`,
    description: "Pricing options for consulting, prototype builds, and ongoing support.",
    url: `${siteConfig.siteUrl}/pricing`,
  };

  return (
    <main className="site-shell page-stack">
      <StructuredData data={jsonLd} />

      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Pricing</p>
          <h1>Simple starting points for getting a project moving.</h1>
          <p>
            These packages are meant to make the first step easy. Every price is shown as Contact so the scope can be
            matched to the work instead of forcing a fixed number.
          </p>
        </div>

        <aside className="surface-card quote-card">
          <p className="eyebrow">How pricing works</p>
          <h2>Clear scope, flexible quote, and the right level of support for the job.</h2>
        </aside>
      </section>

      <section className="section-stack">
        <PricingCards plans={pricingPlans} />
      </section>

      <section className="split-section">
        <div className="section-copy">
          <p className="eyebrow">Need something custom?</p>
          <h2>We can shape a package around the exact problem.</h2>
          <p>
            If your work needs a different cadence, a more technical build, or a mix of strategy and implementation,
            I can tailor the engagement rather than forcing it into a preset box.
          </p>
        </div>

        <div className="stacked-cards">
          <article className="surface-card">
            <span className="metric-label">Best fit</span>
            <h3>Teams with workflow friction</h3>
            <p>Great for owners and operators who need a practical system instead of abstract advice.</p>
          </article>
          <article className="surface-card">
            <span className="metric-label">Typical output</span>
            <h3>Prototype, roadmap, or production-ready slice</h3>
            <p>Depending on scope, the engagement can produce a direction plan, a working tool, or both.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
