"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, LogOut, Shield, ScanSearch } from "lucide-react";

import { LeadDashboard } from "@/components/LeadDashboard";
import type { LeadStore } from "@/lib/lead-types";
import { siteConfig } from "@/lib/site";

type AdminTab = "overview" | "leads" | "maintenance";

interface AdminCommandCenterProps {
  initialStore: LeadStore;
}

export function AdminCommandCenter({ initialStore }: AdminCommandCenterProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const summary = useMemo(() => {
    const contacted = initialStore.leads.filter((lead) => lead.contacted).length;
    const websites = initialStore.leads.filter((lead) => lead.website).length;
    const aiMention = initialStore.leads.filter((lead) => lead.aiMention).length;
    const latestJob = initialStore.job ?? initialStore.recentJobs?.[0] ?? null;

    return {
      total: initialStore.leads.length,
      contacted,
      pending: initialStore.leads.length - contacted,
      websites,
      aiMention,
      averageScore: initialStore.leads.length
        ? Math.round(initialStore.leads.reduce((sum, lead) => sum + lead.overallScore, 0) / initialStore.leads.length)
        : 0,
      latestJob,
    };
  }, [initialStore.job, initialStore.leads, initialStore.recentJobs]);

  const tabButton = (tab: AdminTab, label: string, icon: ReactNode) => (
    <button
      type="button"
      className={activeTab === tab ? "filter-chip active" : "filter-chip"}
      onClick={() => setActiveTab(tab)}
    >
      <span className="lead-contact-row">{icon}</span>
      {label}
    </button>
  );

  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
    });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <section className="surface-card admin-command-center">
      <div className="lead-toolbar admin-toolbar">
        {tabButton("overview", "Overview", <Shield className="size-4" />)}
        {tabButton("leads", "Leads", <ScanSearch className="size-4" />)}
        {tabButton("maintenance", "Maintenance", <FolderOpen className="size-4" />)}

        <div className="button-row admin-actions">
          <Link className="button button-ghost" href="/api/leads/export" prefetch={false} download>
            Export CSV
          </Link>
          <button className="button button-ghost" type="button" onClick={handleLogout}>
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="admin-overview">
          <div className="lead-summary-grid">
            <div className="lead-summary-stat">
              <span className="lead-summary-label">Businesses</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="lead-summary-stat">
              <span className="lead-summary-label">Contacted</span>
              <strong>{summary.contacted}</strong>
            </div>
            <div className="lead-summary-stat">
              <span className="lead-summary-label">Pending</span>
              <strong>{summary.pending}</strong>
            </div>
            <div className="lead-summary-stat">
              <span className="lead-summary-label">Websites</span>
              <strong>{summary.websites}</strong>
            </div>
            <div className="lead-summary-stat">
              <span className="lead-summary-label">AI mentions</span>
              <strong>{summary.aiMention}</strong>
            </div>
            <div className="lead-summary-stat">
              <span className="lead-summary-label">Average score</span>
              <strong>{summary.averageScore}</strong>
            </div>
          </div>

          <div className="card-grid-3 admin-mini-grid">
            <article className="surface-card">
              <span className="metric-label">Mission</span>
              <h3>Stay close to the work</h3>
              <p>Scan nearby businesses, rank the strongest opportunities, and keep outreach status up to date.</p>
            </article>
            <article className="surface-card">
              <span className="metric-label">Access</span>
              <h3>Private by design</h3>
              <p>The lead tool is no longer in the public nav and requires a signed-in admin session.</p>
            </article>
            <article className="surface-card">
              <span className="metric-label">Scan queue</span>
              <h3>{summary.latestJob ? summary.latestJob.status.toUpperCase() : "Idle"}</h3>
              <p>
                {summary.latestJob
                  ? `${summary.latestJob.processedCandidates}/${summary.latestJob.totalCandidates} processed · ${summary.latestJob.resultCount} leads`
                  : "No active scan job right now."}
              </p>
            </article>
            <article className="surface-card">
              <span className="metric-label">Shortcut</span>
              <h3>Jump back to the public site</h3>
              <p>
                <Link className="lead-inline-link" href="/">
                  Open the homepage
                </Link>{" "}
                or{" "}
                <Link className="lead-inline-link" href="/consulting">
                  view consulting
                </Link>
                .
              </p>
            </article>
          </div>
        </div>
      ) : null}

      {activeTab === "leads" ? <LeadDashboard initialStore={initialStore} /> : null}

      {activeTab === "maintenance" ? (
        <div className="admin-maintenance">
          <div className="split-section">
            <div className="section-copy">
              <p className="eyebrow">Maintenance</p>
              <h2>Quick access to the parts of the site you may want to keep an eye on.</h2>
              <p>
                This panel is for the public-facing pieces, while the lead dashboard stays tucked behind the
                authenticated admin surface.
              </p>
            </div>
            <div className="stacked-cards">
              <article className="surface-card">
                <h3>Public pages</h3>
                <div className="footer-links">
                  <Link href="/">Home</Link>
                  <Link href="/portfolio">Portfolio</Link>
                  <Link href="/consulting">Consulting</Link>
                  <Link href="/pricing">Pricing</Link>
                  <Link href="/projects">Projects</Link>
                  <Link href="/videos">Videos</Link>
                  <Link href="/resume">Resume</Link>
                </div>
              </article>
              <article className="surface-card">
                <span className="metric-label">Admin identity</span>
                <h3>{siteConfig.owner}</h3>
                <p>{siteConfig.email}</p>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
