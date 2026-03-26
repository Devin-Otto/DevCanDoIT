"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Download,
  Filter,
  Globe,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  CheckCircle2,
  Circle,
} from "lucide-react";

import { LeadDetailDrawer } from "@/components/LeadDetailDrawer";
import { LeadMapPanel } from "@/components/LeadMapPanel";
import type { BusinessLead, LeadActivity, LeadScanJob, LeadStore } from "@/lib/lead-types";

type ContactFilter = "all" | "contacted" | "not-contacted";
type WebsiteFilter = "all" | "website" | "no-website";
type AiFilter = "all" | "ai" | "no-ai";
type SortKey =
  | "overallScore"
  | "helpScore"
  | "easeScore"
  | "proximityScore"
  | "distanceMiles"
  | "websiteOpportunityScore"
  | "websiteScore"
  | "name"
  | "category";
type SortDirection = "desc" | "asc";

interface LeadDashboardProps {
  initialStore: LeadStore;
}

export function LeadDashboard({ initialStore }: LeadDashboardProps) {
  const [store, setStore] = useState(initialStore);
  const [job, setJob] = useState<LeadScanJob | null>(initialStore.job ?? null);
  const [query, setQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("all");
  const [aiFilter, setAiFilter] = useState<AiFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("overallScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [scanRadiusMiles, setScanRadiusMiles] = useState(15);
  const [scanLimit, setScanLimit] = useState(100);
  const [statusMessage, setStatusMessage] = useState("Ready to scan.");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<BusinessLead | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<LeadActivity[]>([]);
  const [leadDetailLoading, setLeadDetailLoading] = useState(false);
  const [leadDetailSaving, setLeadDetailSaving] = useState(false);
  const [leadDetailError, setLeadDetailError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const values = new Set(store.leads.map((lead) => lead.category));
    return ["all", ...Array.from(values).sort((left, right) => left.localeCompare(right))];
  }, [store.leads]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = store.leads.filter((lead) => {
      const searchable = [
        lead.name,
        lead.category,
        lead.businessType,
        lead.niche,
        lead.recommendation,
        lead.summary,
        lead.address ?? "",
        lead.email ?? "",
        lead.phone ?? "",
        lead.website ?? "",
        lead.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        return false;
      }

      if (contactFilter === "contacted" && !lead.contacted) return false;
      if (contactFilter === "not-contacted" && lead.contacted) return false;
      if (websiteFilter === "website" && !lead.website) return false;
      if (websiteFilter === "no-website" && lead.website) return false;
      if (aiFilter === "ai" && !lead.aiMention) return false;
      if (aiFilter === "no-ai" && lead.aiMention) return false;
      if (categoryFilter !== "all" && lead.category !== categoryFilter) return false;

      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];

      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return sortDirection === "asc"
          ? leftValue.localeCompare(rightValue)
          : rightValue.localeCompare(leftValue);
      }

      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      return sortDirection === "asc" ? leftNumber - rightNumber : rightNumber - leftNumber;
    });

    return sorted;
  }, [aiFilter, categoryFilter, contactFilter, query, sortDirection, sortKey, store.leads, websiteFilter]);

  const summary = useMemo(() => {
    const contacted = store.leads.filter((lead) => lead.contacted).length;
    const aiMention = store.leads.filter((lead) => lead.aiMention).length;
    const websites = store.leads.filter((lead) => Boolean(lead.website)).length;
    const averageScore = store.leads.length
      ? Math.round(store.leads.reduce((sum, lead) => sum + lead.overallScore, 0) / store.leads.length)
      : 0;

    return {
      total: store.leads.length,
      contacted,
      aiMention,
      websites,
      averageScore,
    };
  }, [store.leads]);

  const jobSummary = job
    ? `${job.status.toUpperCase()} · ${job.processedCandidates}/${job.totalCandidates} processed`
    : "No active scan";

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null);
      setSelectedActivities([]);
      setLeadDetailError(null);
      setLeadDetailLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    const loadDetail = async () => {
      setLeadDetailLoading(true);
      setLeadDetailError(null);

      try {
        const response = await fetch(`/api/leads/${selectedLeadId}`, {
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const payload = (await response.json()) as {
          lead?: BusinessLead;
          activities?: LeadActivity[];
          error?: string;
        };

        if (!response.ok || !payload.lead) {
          throw new Error(payload.error || "Unable to load lead details.");
        }

        if (active) {
          setSelectedLead(payload.lead);
          setSelectedActivities(payload.activities ?? []);
        }
      } catch (error) {
        if (active) {
          setLeadDetailError(error instanceof Error ? error.message : "Unable to load lead details.");
        }
      } finally {
        if (active) {
          setLeadDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedLeadId]);

  const runScan = async () => {
    setStatusMessage("Scanning nearby businesses. This can take up to about a minute.");
    setIsScanning(true);

    try {
      const response = await fetch("/api/leads/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: store.origin.latitude,
          longitude: store.origin.longitude,
          radiusMeters: Math.round(scanRadiusMiles * 1609.34),
          limit: scanLimit,
        }),
      });

      const payload = (await response.json()) as { job?: LeadScanJob; error?: string };

      if (!response.ok || !payload.job) {
        throw new Error(payload.error || "Scan failed");
      }

      setJob(payload.job);
      setStatusMessage(`Queued scan job ${payload.job.id}. Waiting for the background worker...`);

      const startedAt = Date.now();
      let currentJob = payload.job;
      let currentStore = store;

      while (currentJob.status === "queued" || currentJob.status === "running") {
        const jobResponse = await fetch(`/api/leads/jobs/${currentJob.id}`, {
          headers: {
            Accept: "application/json",
          },
        });

        const jobPayload = (await jobResponse.json()) as {
          job?: LeadScanJob;
          store?: LeadStore;
          error?: string;
        };

        if (!jobResponse.ok || !jobPayload.job || !jobPayload.store) {
          throw new Error(jobPayload.error || "Unable to load scan progress.");
        }

        currentJob = jobPayload.job;
        currentStore = jobPayload.store;
        setJob(currentJob);
        setStore(currentStore);
        setStatusMessage(
          currentJob.status === "completed"
            ? `Found ${currentStore.resultCount} businesses and ranked them.`
            : `Scanning ${currentJob.processedCandidates}/${currentJob.totalCandidates} businesses...`,
        );

        if (Date.now() - startedAt > 120_000) {
          setStatusMessage("The background worker is still processing this scan. Results will continue to appear here.");
          break;
        }

        if (currentJob.status === "completed" || currentJob.status === "failed") {
          break;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      setJob(currentJob);
      setStore(currentStore);
      setStatusMessage(
        currentJob.partial
          ? `Loaded ${currentStore.resultCount} businesses. Partial results returned so the dashboard can stay responsive.`
          : `Found ${currentStore.resultCount} businesses and ranked them.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to scan businesses right now.");
    } finally {
      setIsScanning(false);
    }
  };

  const openLeadDetails = (lead: BusinessLead) => {
    setSelectedLeadId(lead.id);
    setLeadDetailError(null);
  };

  const saveLeadDetails = async (patch: Partial<Pick<BusinessLead, "contacted" | "notes" | "website" | "email" | "phone">>) => {
    if (!selectedLeadId) return;

    setLeadDetailSaving(true);
    try {
      const response = await fetch(`/api/leads/${selectedLeadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      const payload = (await response.json()) as { store?: LeadStore; error?: string };
      if (!response.ok || !payload.store) {
        throw new Error(payload.error || "Could not save lead.");
      }

      setStore(payload.store);

      const detailResponse = await fetch(`/api/leads/${selectedLeadId}`, {
        headers: {
          Accept: "application/json",
        },
      });
      const detailPayload = (await detailResponse.json()) as {
        lead?: BusinessLead;
        activities?: LeadActivity[];
        error?: string;
      };

      if (detailResponse.ok && detailPayload.lead) {
        setSelectedLead(detailPayload.lead);
        setSelectedActivities(detailPayload.activities ?? []);
      }

      setStatusMessage(`${selectedLead?.name ?? "Lead"} updated.`);
    } catch (error) {
      setLeadDetailError(error instanceof Error ? error.message : "Could not save lead.");
    } finally {
      setLeadDetailSaving(false);
    }
  };

  const toggleContacted = async (lead: BusinessLead) => {
    const nextContacted = !lead.contacted;
    const previousStore = store;
    setStore((current) => ({
      ...current,
      leads: current.leads.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              contacted: nextContacted,
              contactedAt: nextContacted ? item.contactedAt ?? new Date().toISOString() : null,
            }
          : item,
      ),
    }));

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contacted: nextContacted }),
      });

      const payload = (await response.json()) as { store?: LeadStore; error?: string };

      if (!response.ok || !payload.store) {
        throw new Error(payload.error || "Could not save contacted status.");
      }

      setStore(payload.store);
      setStatusMessage(`${lead.name} marked as ${nextContacted ? "contacted" : "not contacted"}.`);
    } catch {
      setStore(previousStore);
      setStatusMessage("Could not save contacted status.");
    }
  };

  const exportCsv = () => {
    const rows = filteredLeads.map((lead, index) => [
      index + 1,
      lead.name,
      lead.category,
      lead.businessType,
      lead.niche,
      lead.recommendation,
      lead.website ?? "",
      lead.websiteStatus,
      lead.websiteSource ?? "",
      lead.websiteConfidence,
      lead.websiteScore,
      lead.websiteOpportunityScore,
      lead.discoveryConfidence,
      lead.helpScore,
      lead.easeScore,
      lead.proximityScore,
      lead.overallScore,
      lead.aiMention ? "yes" : "no",
      lead.aiSource ?? "",
      lead.email ?? "",
      lead.emailStatus,
      lead.emailSource ?? "",
      lead.phone ?? "",
      lead.phoneStatus,
      lead.phoneSource ?? "",
      lead.address ?? "",
      lead.latitude,
      lead.longitude,
      lead.distanceMiles,
      JSON.stringify(lead.rankReasons ?? []),
      JSON.stringify(lead.evidence ?? null),
      lead.contacted ? "yes" : "no",
      lead.contactedAt ?? "",
      lead.notes ?? "",
    ]);

    const headers = [
      "rank",
      "name",
      "category",
      "businessType",
      "niche",
      "recommendation",
      "website",
      "websiteStatus",
      "websiteSource",
      "websiteConfidence",
      "websiteScore",
      "websiteOpportunityScore",
      "discoveryConfidence",
      "helpScore",
      "easeScore",
      "proximityScore",
      "overallScore",
      "aiMention",
      "aiSource",
      "email",
      "emailStatus",
      "emailSource",
      "phone",
      "phoneStatus",
      "phoneSource",
      "address",
      "latitude",
      "longitude",
      "distanceMiles",
      "rankReasons",
      "evidence",
      "contacted",
      "contactedAt",
      "notes",
    ];

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            return /[,"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "devcandoit-leads.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const applyPreset = (preset: "help" | "sites" | "close" | "review") => {
    if (preset === "help") {
      setContactFilter("all");
      setWebsiteFilter("all");
      setAiFilter("all");
      setCategoryFilter("all");
      setSortKey("helpScore");
      setSortDirection("desc");
      setQuery("");
      return;
    }

    if (preset === "sites") {
      setContactFilter("all");
      setWebsiteFilter("all");
      setAiFilter("all");
      setCategoryFilter("all");
      setSortKey("websiteOpportunityScore");
      setSortDirection("desc");
      setQuery("");
      return;
    }

    if (preset === "close") {
      setContactFilter("all");
      setWebsiteFilter("all");
      setAiFilter("all");
      setCategoryFilter("all");
      setSortKey("distanceMiles");
      setSortDirection("asc");
      setQuery("");
      return;
    }

    setContactFilter("not-contacted");
    setWebsiteFilter("no-website");
    setAiFilter("no-ai");
    setCategoryFilter("all");
    setSortKey("overallScore");
    setSortDirection("desc");
    setQuery("");
  };

  return (
    <div className="lead-dashboard" id="lead-dashboard">
      <section className="surface-card lead-summary-panel">
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

        <div className="lead-scan-panel">
          <div>
            <p className="eyebrow">Scan origin</p>
            <p className="muted">
              {store.origin.latitude.toFixed(6)}, {store.origin.longitude.toFixed(6)}
            </p>
          </div>

          <div className="lead-scan-controls">
            <label>
              <span>Radius (mi)</span>
              <input
                className="lead-control"
                type="number"
                min="1"
                max="50"
                step="1"
                value={scanRadiusMiles}
                onChange={(event) => setScanRadiusMiles(Number(event.target.value))}
              />
            </label>
            <label>
              <span>Limit</span>
              <input
                className="lead-control"
                type="number"
                min="20"
                max="250"
                step="5"
                value={scanLimit}
                onChange={(event) => setScanLimit(Number(event.target.value))}
              />
            </label>
            <button className="button" onClick={runScan} disabled={isScanning}>
              {isScanning ? <LoaderCircle className="icon-spin" /> : <RefreshCw className="size-4" />}
              Scan nearby businesses
            </button>
            <button className="button button-ghost" onClick={exportCsv}>
              <Download className="size-4" />
              Export current view
            </button>
          </div>

          <p className="muted" aria-live="polite">
            {statusMessage}
          </p>
          <p className="muted">{jobSummary}</p>
          {store.partial ? (
            <p className="muted">
              This scan returned partial results to keep the dashboard responsive. Run it again if you want a deeper pass.
            </p>
          ) : null}
        </div>
      </section>

      <section className="surface-card lead-toolbar">
        <div className="lead-search">
          <Search className="size-4" />
          <input
            aria-label="Search leads"
            placeholder="Search name, niche, category, address, or contact info"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <label>
          <span>
            <Filter className="size-4" />
            Contact
          </span>
          <select value={contactFilter} onChange={(event) => setContactFilter(event.target.value as ContactFilter)}>
            <option value="all">All</option>
            <option value="contacted">Contacted</option>
            <option value="not-contacted">Not contacted</option>
          </select>
        </label>

        <label>
          <span>
            <Globe className="size-4" />
            Website
          </span>
          <select value={websiteFilter} onChange={(event) => setWebsiteFilter(event.target.value as WebsiteFilter)}>
            <option value="all">All</option>
            <option value="website">Has website</option>
            <option value="no-website">No website</option>
          </select>
        </label>

        <label>
          <span>
            <Sparkles className="size-4" />
            AI
          </span>
          <select value={aiFilter} onChange={(event) => setAiFilter(event.target.value as AiFilter)}>
            <option value="all">All</option>
            <option value="ai">Mentions AI</option>
            <option value="no-ai">No AI mention</option>
          </select>
        </label>

        <label>
          <span>
            <Store className="size-4" />
            Category
          </span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All" : category}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>
            <ArrowUpDown className="size-4" />
            Sort
          </span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="overallScore">Overall score</option>
            <option value="helpScore">How much I can help</option>
            <option value="easeScore">Ease of help</option>
            <option value="proximityScore">Proximity</option>
            <option value="distanceMiles">Distance</option>
            <option value="websiteOpportunityScore">Best sites to replace</option>
            <option value="websiteScore">Website score</option>
            <option value="name">Name</option>
            <option value="category">Category</option>
          </select>
        </label>

        <button
          className="button button-ghost"
          onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
        >
          {sortDirection === "asc" ? "Asc" : "Desc"}
        </button>
      </section>

      <section className="lead-preset-row">
        <button className="filter-chip" type="button" onClick={() => applyPreset("help")}>
          Highest help
        </button>
        <button className="filter-chip" type="button" onClick={() => applyPreset("sites")}>
          Best sites to replace
        </button>
        <button className="filter-chip" type="button" onClick={() => applyPreset("close")}>
          Closest opportunities
        </button>
        <button className="filter-chip" type="button" onClick={() => applyPreset("review")}>
          Needs manual review
        </button>
      </section>

      <LeadMapPanel
        origin={store.origin}
        leads={filteredLeads}
        selectedLeadId={selectedLeadId}
        onSelectLead={openLeadDetails}
      />

      <section className="surface-card lead-table-panel">
        <div className="lead-table-topline">
          <p className="eyebrow">Spreadsheet view</p>
          <p className="muted">{filteredLeads.length} leads after filters</p>
        </div>

        <div className="lead-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Business</th>
                <th>Category / niche</th>
                <th>Website</th>
                <th>Contact</th>
                <th>Scores</th>
                <th>Status</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="lead-empty-state">
                      <strong>No businesses yet.</strong>
                      <p className="muted">
                        Run a scan to pull nearby businesses into the dashboard, then filter, sort, and export the
                        list.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => (
                  <tr key={lead.id} className={lead.contacted ? "is-contacted" : undefined}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="lead-business">
                        <strong>{lead.name}</strong>
                        <span>{lead.businessType}</span>
                        <span className="muted">{lead.address ?? "No address found"}</span>
                        <button
                          className="lead-inline-link lead-text-button"
                          type="button"
                          onClick={() => openLeadDetails(lead)}
                        >
                          View details
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="lead-meta-stack">
                        <span>{lead.category}</span>
                        <span>{lead.niche}</span>
                        <span className="muted">{lead.recommendation}</span>
                      </div>
                    </td>
                    <td>
                      <div className="lead-meta-stack">
                        <span>
                          {lead.website ? (
                            <a className="lead-inline-link" href={lead.website} target="_blank" rel="noreferrer">
                              {lead.websiteHost}
                            </a>
                          ) : (
                            "No verified website found"
                          )}
                        </span>
                        <span className="lead-contact-row">
                          <Sparkles className="size-3.5" />
                          {lead.websiteStatus}
                          {lead.websiteSource ? ` · ${lead.websiteSource}` : ""}
                        </span>
                        <span>Confidence {lead.websiteConfidence}</span>
                        <span>Site score: {lead.websiteScore}</span>
                        <span className="muted">{lead.aiMention ? "Mentions AI" : "No AI mention"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="lead-meta-stack">
                        <span className="lead-contact-row">
                          <Mail className="size-3.5" />
                          {lead.email ?? "No email"}
                        </span>
                        <span className="muted">
                          {lead.emailStatus}
                          {lead.emailSource ? ` · ${lead.emailSource}` : ""}
                        </span>
                        <span className="lead-contact-row">
                          <Phone className="size-3.5" />
                          {lead.phone ?? "No phone"}
                        </span>
                        <span className="muted">
                          {lead.phoneStatus}
                          {lead.phoneSource ? ` · ${lead.phoneSource}` : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="lead-score-stack">
                        <span>Help {lead.helpPotentialScore ?? lead.helpScore}</span>
                        <span>Ease {lead.easeOfHelpScore ?? lead.easeScore}</span>
                        <span>Proximity {lead.proximityScore}</span>
                        <span>Overall {lead.overallScore}</span>
                        <span>Discovery {lead.discoveryConfidence}</span>
                        <div className="lead-reason-row">
                          {lead.rankReasons.slice(0, 3).map((reason) => (
                            <span key={reason.code} className="lead-reason-chip" title={reason.detail}>
                              {reason.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>
                      <button className="lead-contact-toggle" onClick={() => toggleContacted(lead)}>
                        {lead.contacted ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                        {lead.contacted ? "Contacted" : "Mark contacted"}
                      </button>
                    </td>
                    <td>
                      <div className="lead-meta-stack">
                        <span className="lead-contact-row">
                          <MapPin className="size-3.5" />
                          {lead.distanceMiles.toFixed(1)} mi
                        </span>
                        <span className="muted">
                          {lead.latitude.toFixed(4)}, {lead.longitude.toFixed(4)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LeadDetailDrawer
        open={Boolean(selectedLeadId)}
        lead={selectedLead}
        activities={selectedActivities}
        loading={leadDetailLoading}
        saving={leadDetailSaving}
        error={leadDetailError}
        onClose={() => setSelectedLeadId(null)}
        onSave={saveLeadDetails}
      />
    </div>
  );
}
