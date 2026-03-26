"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin, Mail, Phone, Sparkles, X } from "lucide-react";

import type { BusinessLead, LeadActivity } from "@/lib/lead-types";

type LeadPatch = Partial<Pick<BusinessLead, "contacted" | "notes" | "website" | "email" | "phone">>;

interface LeadDetailDrawerProps {
  open: boolean;
  lead: BusinessLead | null;
  activities: LeadActivity[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (patch: LeadPatch) => Promise<void>;
}

function formatMaybeObject(value: Record<string, unknown> | null) {
  if (!value) return "No evidence yet.";
  const entries = Object.entries(value).filter(([, next]) => next !== null && typeof next !== "undefined");
  if (entries.length === 0) {
    return "No evidence yet.";
  }

  return entries
    .map(([key, next]) => `${key}: ${typeof next === "object" ? JSON.stringify(next) : String(next)}`)
    .join(" · ");
}

export function LeadDetailDrawer({
  open,
  lead,
  activities,
  loading,
  saving,
  error,
  onClose,
  onSave,
}: LeadDetailDrawerProps) {
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contacted, setContacted] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setNotes(lead.notes ?? "");
    setWebsite(lead.website ?? "");
    setEmail(lead.email ?? "");
    setPhone(lead.phone ?? "");
    setContacted(Boolean(lead.contacted));
  }, [lead]);

  const evidenceItems = useMemo(
    () =>
      lead
        ? [
            { label: "Website", evidence: lead.evidence.website, status: lead.websiteStatus },
            { label: "Email", evidence: lead.evidence.email, status: lead.emailStatus },
            { label: "Phone", evidence: lead.evidence.phone, status: lead.phoneStatus },
            { label: "AI", evidence: lead.evidence.ai, status: lead.aiMention ? "detected" : "missing" },
            {
              label: "Discovery",
              evidence: lead.evidence.discovery,
              status:
                lead.discoveryConfidence >= 70
                  ? "verified"
                  : lead.discoveryConfidence >= 40
                    ? "inferred"
                    : "missing",
            },
          ]
        : [],
    [lead],
  );

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    if (!lead) return;
    await onSave({
      contacted,
      notes: notes.trim(),
      website: website.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
  };

  return (
    <div className="lead-drawer-overlay" role="dialog" aria-modal="true" aria-label="Lead details">
      <button className="lead-drawer-backdrop" type="button" onClick={onClose} aria-label="Close lead drawer" />

      <aside className="surface-card lead-drawer">
        <div className="lead-drawer-header">
          <div>
            <p className="eyebrow">Lead detail</p>
            <h2>{lead?.name ?? "Loading lead..."}</h2>
            <p className="muted">
              {lead ? `${lead.category} · ${lead.businessType}` : "Fetching the latest details and history."}
            </p>
          </div>
          <button className="button button-ghost" type="button" onClick={onClose}>
            <X className="size-4" />
            Close
          </button>
        </div>

        {loading ? <p className="muted">Loading lead details...</p> : null}
        {error ? <p className="form-state error">{error}</p> : null}

        {lead ? (
          <div className="lead-drawer-body">
            <div className="lead-drawer-hero">
              <div className="lead-drawer-stat">
                <span className="lead-summary-label">Overall</span>
                <strong>{lead.overallScore}</strong>
              </div>
              <div className="lead-drawer-stat">
                <span className="lead-summary-label">Help</span>
                <strong>{lead.helpPotentialScore}</strong>
              </div>
              <div className="lead-drawer-stat">
                <span className="lead-summary-label">Ease</span>
                <strong>{lead.easeOfHelpScore}</strong>
              </div>
              <div className="lead-drawer-stat">
                <span className="lead-summary-label">Distance</span>
                <strong>{lead.distanceMiles.toFixed(1)} mi</strong>
              </div>
            </div>

            <div className="lead-drawer-grid">
              <section className="lead-drawer-card">
                <div className="lead-drawer-card-title">
                  <p className="eyebrow">Contact</p>
                  <span className="muted">{lead.contacted ? "Already contacted" : "Not yet contacted"}</span>
                </div>

                <label>
                  <span>Website</span>
                  <input value={website} onChange={(event) => setWebsite(event.target.value)} />
                </label>
                <label>
                  <span>Email</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label>
                  <span>Phone</span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>

                <label className="lead-drawer-check">
                  <input
                    type="checkbox"
                    checked={contacted}
                    onChange={(event) => setContacted(event.target.checked)}
                  />
                  <span>Mark as contacted</span>
                </label>

                <label>
                  <span>Notes</span>
                  <textarea
                    rows={6}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add outreach notes, reminders, or follow-up ideas."
                  />
                </label>

                <div className="button-row">
                  <button className="button" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  {lead.website ? (
                    <a className="button button-ghost" href={lead.website} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Open site
                    </a>
                  ) : null}
                  <a
                    className="button button-ghost"
                    href={`https://www.openstreetmap.org/?mlat=${lead.latitude}&mlon=${lead.longitude}#map=18/${lead.latitude}/${lead.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin className="size-4" />
                    View map
                  </a>
                </div>
              </section>

              <section className="lead-drawer-card">
                <div className="lead-drawer-card-title">
                  <p className="eyebrow">Evidence</p>
                  <span className="muted">Verified, inferred, and missing states</span>
                </div>

                <div className="lead-evidence-list">
                  {evidenceItems.map(({ label, evidence, status }) => (
                    <article key={label} className="lead-evidence-item">
                      <div className="lead-evidence-topline">
                        <strong>{label}</strong>
                        <span>{status}</span>
                      </div>
                      <p>{formatMaybeObject(evidence)}</p>
                    </article>
                  ))}
                </div>

                <div className="lead-reason-row">
                  {lead.rankReasons.map((reason) => (
                    <span key={reason.code} className="lead-reason-chip" title={reason.detail}>
                      {reason.label}
                    </span>
                  ))}
                </div>

                <div className="lead-contact-row lead-drawer-meta">
                  <Mail className="size-3.5" />
                  <span>{lead.email ?? "No email"}</span>
                </div>
                <div className="lead-contact-row lead-drawer-meta">
                  <Phone className="size-3.5" />
                  <span>{lead.phone ?? "No phone"}</span>
                </div>
                <div className="lead-contact-row lead-drawer-meta">
                  <Sparkles className="size-3.5" />
                  <span>{lead.websiteStatus} website discovery</span>
                </div>
              </section>
            </div>

            <section className="lead-drawer-card">
              <div className="lead-drawer-card-title">
                <p className="eyebrow">Contact history</p>
                <span className="muted">{activities.length} records</span>
              </div>

              <div className="lead-history-list">
                {activities.length === 0 ? (
                  <p className="muted">No recorded activity yet. Save notes or mark the lead contacted to start a history.</p>
                ) : (
                  activities.map((activity) => (
                    <article key={activity.id} className="lead-history-item">
                      <div className="lead-evidence-topline">
                        <strong>{activity.type}</strong>
                        <span>{new Date(activity.createdAt).toLocaleString()}</span>
                      </div>
                      <p>{formatMaybeObject(activity.detail)}</p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
