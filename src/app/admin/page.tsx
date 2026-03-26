import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AdminCommandCenter } from "@/components/AdminCommandCenter";
import { StructuredData } from "@/components/StructuredData";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { loadLeadStore } from "@/lib/lead-finder";
import { isPublicSiteOnly } from "@/lib/runtime-flags";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Admin",
  description: "Private command center for lead tracking, scanning, and site maintenance.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (isPublicSiteOnly) {
    notFound();
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!(await verifyAdminSessionToken(session))) {
    redirect("/admin/login");
  }

  const initialStore = await loadLeadStore();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${siteConfig.name} Command Center`,
    description: "Private admin surface for lead tracking and site maintenance.",
    url: `${siteConfig.siteUrl}/admin`,
  };

  return (
    <main className="site-shell page-stack leads-page">
      <StructuredData data={jsonLd} />

      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Command center</p>
          <h1>Private workspace for leads, scans, and site maintenance.</h1>
          <p>
            Use this panel to manage nearby-business leads, check what needs outreach, and keep the public site
            aligned with the work.
          </p>
        </div>

        <aside className="surface-card quote-card">
          <p className="eyebrow">Private access</p>
          <h2>Built for Devin only.</h2>
          <p className="muted">
            Username and password are authenticated behind a hashed login and a signed session cookie.
          </p>
        </aside>
      </section>

      <AdminCommandCenter initialStore={initialStore} />
    </main>
  );
}
