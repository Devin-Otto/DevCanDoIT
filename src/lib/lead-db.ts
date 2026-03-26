"use server";

import { createClient, type Client } from "@libsql/client";
import { existsSync } from "fs";
import { mkdir, readFile } from "fs/promises";
import path from "path";

import {
  DEFAULT_ORIGIN,
  DEFAULT_SCAN_LIMIT,
  DEFAULT_SCAN_RADIUS_METERS,
  type BusinessLead,
  type LeadActivity,
  type LeadEvidenceBundle,
  type LeadRankReason,
  type LeadScanJob,
  type LeadStore,
} from "@/lib/lead-types";
import {
  decryptSensitiveText,
  encryptOptionalSensitiveText,
  isEncryptedPayload,
} from "@/lib/encryption";

type LeadScanRunRow = {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  origin_lat: number;
  origin_lng: number;
  radius_meters: number;
  limit_count: number;
  source: string;
  total_candidates: number;
  processed_candidates: number;
  result_count: number;
  partial: number;
  scan_duration_ms: number;
  failure_reason: string | null;
  candidates_json: string | null;
  processing_cursor: number;
  batch_size: number;
};

type LeadRow = {
  id: string;
  last_run_id: string;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  name: string;
  category: string;
  business_type: string;
  niche: string;
  recommendation: string;
  summary: string;
  website: string | null;
  website_host: string | null;
  website_status: string;
  website_source: string | null;
  website_confidence: number;
  website_score: number;
  website_opportunity_score: number;
  website_signals_json: string;
  ai_mention: number;
  ai_signals_json: string;
  ai_source: string | null;
  email: string | null;
  email_status: string;
  email_source: string | null;
  phone: string | null;
  phone_status: string;
  phone_source: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  distance_miles: number;
  help_score: number;
  help_potential_score: number;
  ease_score: number;
  ease_of_help_score: number;
  proximity_score: number;
  overall_score: number;
  discovery_confidence: number;
  rank_reasons_json: string;
  evidence_json: string;
  tags_json: string;
  source: string;
  last_checked_at: string;
  contacted: number;
  contacted_at: string | null;
  notes: string | null;
};

type LeadActivityRow = {
  id: string;
  lead_id: string;
  type: string;
  detail_json: string | null;
  created_at: string;
};

type LeadWorkerHeartbeatRow = {
  id: string;
  status: string;
  last_seen_at: string;
  current_job_id: string | null;
  current_step: string | null;
  note: string | null;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const LOCAL_DB_PATH = path.join(DATA_DIR, "leads.db").replace(/\\/g, "/");
const DEFAULT_DB_URL = `file:${LOCAL_DB_PATH}`;
const LEGACY_JSON_PATH = path.join(DATA_DIR, "business-leads.json");

let clientPromise: Promise<Client> | null = null;
let initPromise: Promise<void> | null = null;

function dbUrl() {
  const configured = process.env.LEAD_DATABASE_URL?.trim();

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("LEAD_DATABASE_URL must be set in production.");
  }

  return DEFAULT_DB_URL;
}

function dbAuthToken() {
  const configured = process.env.LEAD_DATABASE_AUTH_TOKEN?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    const url = dbUrl();
    if (!url.startsWith("file:")) {
      throw new Error("LEAD_DATABASE_AUTH_TOKEN must be set in production for a remote LibSQL database.");
    }
  }

  return undefined;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = Promise.resolve(
      createClient({
        url: dbUrl(),
        authToken: dbAuthToken(),
      }),
    );
  }

  return clientPromise;
}

export async function ensureLeadDatabase() {
  if (!initPromise) {
    initPromise = initializeLeadDatabase();
  }

  return initPromise;
}

async function initializeLeadDatabase() {
  await mkdir(DATA_DIR, { recursive: true });
  const client = await getClient();

  const statements = [
    `CREATE TABLE IF NOT EXISTS lead_scan_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      radius_meters INTEGER NOT NULL,
      limit_count INTEGER NOT NULL,
      source TEXT NOT NULL,
      total_candidates INTEGER NOT NULL DEFAULT 0,
      processed_candidates INTEGER NOT NULL DEFAULT 0,
      result_count INTEGER NOT NULL DEFAULT 0,
      partial INTEGER NOT NULL DEFAULT 0,
      scan_duration_ms INTEGER NOT NULL DEFAULT 0,
      failure_reason TEXT,
      candidates_json TEXT,
      processing_cursor INTEGER NOT NULL DEFAULT 0,
      batch_size INTEGER NOT NULL DEFAULT 8
    )`,
    `CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      last_run_id TEXT NOT NULL,
      osm_type TEXT NOT NULL,
      osm_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      business_type TEXT NOT NULL,
      niche TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      summary TEXT NOT NULL,
      website TEXT,
      website_host TEXT,
      website_status TEXT NOT NULL,
      website_source TEXT,
      website_confidence INTEGER NOT NULL DEFAULT 0,
      website_score INTEGER NOT NULL DEFAULT 0,
      website_opportunity_score INTEGER NOT NULL DEFAULT 0,
      website_signals_json TEXT NOT NULL,
      ai_mention INTEGER NOT NULL DEFAULT 0,
      ai_signals_json TEXT NOT NULL,
      ai_source TEXT,
      email TEXT,
      email_status TEXT NOT NULL,
      email_source TEXT,
      phone TEXT,
      phone_status TEXT NOT NULL,
      phone_source TEXT,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      distance_miles REAL NOT NULL,
      help_score INTEGER NOT NULL DEFAULT 0,
      help_potential_score INTEGER NOT NULL DEFAULT 0,
      ease_score INTEGER NOT NULL DEFAULT 0,
      ease_of_help_score INTEGER NOT NULL DEFAULT 0,
      proximity_score INTEGER NOT NULL DEFAULT 0,
      overall_score INTEGER NOT NULL DEFAULT 0,
      discovery_confidence INTEGER NOT NULL DEFAULT 0,
      rank_reasons_json TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      source TEXT NOT NULL,
      last_checked_at TEXT NOT NULL,
      contacted INTEGER NOT NULL DEFAULT 0,
      contacted_at TEXT,
      notes TEXT,
      FOREIGN KEY (last_run_id) REFERENCES lead_scan_runs(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS lead_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      type TEXT NOT NULL,
      detail_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS lead_worker_heartbeat (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      current_job_id TEXT,
      current_step TEXT,
      note TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lead_runs_created_at ON lead_scan_runs(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_run_score ON leads(last_run_id, overall_score DESC, help_score DESC, ease_score DESC, proximity_score DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_contacted ON leads(contacted, contacted_at)`,
    `CREATE INDEX IF NOT EXISTS idx_lead_activity_lead ON lead_activities(lead_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_lead_worker_heartbeat_seen ON lead_worker_heartbeat(last_seen_at DESC)`,
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }

  await migrateLegacyStoreIfNeeded(client);
  await migrateEncryptedStoreIfNeeded(client);
}

async function migrateLegacyStoreIfNeeded(client: Client) {
  if (!existsSync(LEGACY_JSON_PATH)) {
    return;
  }

  const countResult = await client.execute("SELECT COUNT(*) AS count FROM lead_scan_runs");
  const count = Number(countResult.rows[0]?.count ?? 0);
  if (count > 0) {
    return;
  }

  const raw = await readFile(LEGACY_JSON_PATH, "utf8");
  const parsed = JSON.parse(raw) as LeadStore;
  const runId = `legacy-${parsed.updatedAt.replace(/[^0-9]/g, "") || Date.now().toString()}`;

  await client.execute({
    sql: `INSERT INTO lead_scan_runs (
      id, status, created_at, started_at, completed_at,
      origin_lat, origin_lng, radius_meters, limit_count, source,
      total_candidates, processed_candidates, result_count, partial, scan_duration_ms,
      failure_reason, candidates_json, processing_cursor, batch_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      runId,
      parsed.partial ? "completed" : "completed",
      parsed.updatedAt,
      parsed.updatedAt,
      parsed.updatedAt,
      parsed.origin.latitude,
      parsed.origin.longitude,
      parsed.radiusMeters,
      parsed.limit,
      parsed.source,
      parsed.leads.length,
      parsed.leads.length,
      parsed.resultCount,
      parsed.partial ? 1 : 0,
      parsed.scanDurationMs ?? 0,
      null,
      encryptOptionalSensitiveText(JSON.stringify([])),
      parsed.leads.length,
      8,
    ],
  });

  for (const lead of parsed.leads) {
    await upsertLeadRow(client, runId, lead);
  }
}

async function migrateEncryptedStoreIfNeeded(client: Client) {
  const leadRows = await client.execute({
    sql: `SELECT id, website, email, phone, address, notes FROM leads`,
  });

  for (const resultRow of leadRows.rows) {
    const row = resultRow as unknown as {
      id: string;
      website: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      notes: string | null;
    };

    const assignments: string[] = [];
    const args: Array<string | number | bigint | Uint8Array | null> = [];

    if (typeof row.website === "string" && row.website.length > 0 && !isEncryptedPayload(row.website)) {
      assignments.push("website = ?");
      args.push(encryptOptionalSensitiveText(row.website));
    }

    if (typeof row.email === "string" && row.email.length > 0 && !isEncryptedPayload(row.email)) {
      assignments.push("email = ?");
      args.push(encryptOptionalSensitiveText(row.email));
    }

    if (typeof row.phone === "string" && row.phone.length > 0 && !isEncryptedPayload(row.phone)) {
      assignments.push("phone = ?");
      args.push(encryptOptionalSensitiveText(row.phone));
    }

    if (typeof row.address === "string" && row.address.length > 0 && !isEncryptedPayload(row.address)) {
      assignments.push("address = ?");
      args.push(encryptOptionalSensitiveText(row.address));
    }

    if (typeof row.notes === "string" && row.notes.length > 0 && !isEncryptedPayload(row.notes)) {
      assignments.push("notes = ?");
      args.push(encryptOptionalSensitiveText(row.notes));
    }

    if (assignments.length === 0) {
      continue;
    }

    await client.execute({
      sql: `UPDATE leads SET ${assignments.join(", ")} WHERE id = ?`,
      args: [...args, row.id],
    });
  }

  const activityRows = await client.execute({
    sql: `SELECT id, detail_json FROM lead_activities`,
  });

  for (const resultRow of activityRows.rows) {
    const row = resultRow as unknown as { id: string; detail_json: string | null };
    if (typeof row.detail_json !== "string" || row.detail_json.length === 0 || isEncryptedPayload(row.detail_json)) {
      continue;
    }

    await client.execute({
      sql: `UPDATE lead_activities SET detail_json = ? WHERE id = ?`,
      args: [encryptOptionalSensitiveText(row.detail_json), row.id],
    });
  }

  const runRows = await client.execute({
    sql: `SELECT id, candidates_json, failure_reason FROM lead_scan_runs`,
  });

  for (const resultRow of runRows.rows) {
    const row = resultRow as unknown as {
      id: string;
      candidates_json: string | null;
      failure_reason: string | null;
    };

    const assignments: string[] = [];
    const args: Array<string | number | bigint | Uint8Array | null> = [];

    if (
      typeof row.candidates_json === "string" &&
      row.candidates_json.length > 0 &&
      !isEncryptedPayload(row.candidates_json)
    ) {
      assignments.push("candidates_json = ?");
      args.push(encryptOptionalSensitiveText(row.candidates_json));
    }

    if (
      typeof row.failure_reason === "string" &&
      row.failure_reason.length > 0 &&
      !isEncryptedPayload(row.failure_reason)
    ) {
      assignments.push("failure_reason = ?");
      args.push(encryptOptionalSensitiveText(row.failure_reason));
    }

    if (assignments.length === 0) {
      continue;
    }

    await client.execute({
      sql: `UPDATE lead_scan_runs SET ${assignments.join(", ")} WHERE id = ?`,
      args: [...args, row.id],
    });
  }

  const heartbeatRows = await client.execute({
    sql: `SELECT id, note FROM lead_worker_heartbeat`,
  });

  for (const resultRow of heartbeatRows.rows) {
    const row = resultRow as unknown as { id: string; note: string | null };
    if (typeof row.note !== "string" || row.note.length === 0 || isEncryptedPayload(row.note)) {
      continue;
    }

    await client.execute({
      sql: `UPDATE lead_worker_heartbeat SET note = ? WHERE id = ?`,
      args: [encryptOptionalSensitiveText(row.note), row.id],
    });
  }
}

export async function listLeadScanJobs(limit = 10): Promise<LeadScanJob[]> {
  await ensureLeadDatabase();
  const client = await getClient();
  const result = await client.execute({
    sql: `SELECT * FROM lead_scan_runs ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => mapJobRow(row as unknown as LeadScanRunRow));
}

export async function getLeadScanJob(id: string): Promise<LeadScanJob | null> {
  await ensureLeadDatabase();
  const client = await getClient();
  const result = await client.execute({
    sql: `SELECT * FROM lead_scan_runs WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0] as unknown as LeadScanRunRow | undefined;
  return row ? mapJobRow(row) : null;
}

export async function getLeadWorkerHeartbeat() {
  await ensureLeadDatabase();
  const client = await getClient();
  const result = await client.execute({
    sql: `SELECT * FROM lead_worker_heartbeat WHERE id = 'lead-worker' LIMIT 1`,
  });
  const row = result.rows[0] as unknown as LeadWorkerHeartbeatRow | undefined;
  if (!row) {
    return null;
  }

  return {
    status: row.status,
    lastSeenAt: row.last_seen_at,
    currentJobId: row.current_job_id,
    currentStep: row.current_step,
    note: decryptSensitiveText(row.note),
  };
}

export async function setLeadWorkerHeartbeat(args: {
  status: string;
  currentJobId?: string | null;
  currentStep?: string | null;
  note?: string | null;
}) {
  await ensureLeadDatabase();
  const client = await getClient();
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO lead_worker_heartbeat (id, status, last_seen_at, current_job_id, current_step, note)
      VALUES ('lead-worker', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        last_seen_at = excluded.last_seen_at,
        current_job_id = excluded.current_job_id,
        current_step = excluded.current_step,
        note = excluded.note`,
    args: [
      args.status,
      now,
      args.currentJobId ?? null,
      args.currentStep ?? null,
      encryptOptionalSensitiveText(args.note ?? null),
    ],
  });
}

export async function createLeadScanJob(args: {
  id: string;
  origin: { latitude: number; longitude: number };
  radiusMeters: number;
  limit: number;
  source?: string;
}): Promise<LeadScanJob> {
  await ensureLeadDatabase();
  const client = await getClient();
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO lead_scan_runs (
      id, status, created_at, started_at, completed_at,
      origin_lat, origin_lng, radius_meters, limit_count, source,
      total_candidates, processed_candidates, result_count, partial, scan_duration_ms,
      failure_reason, candidates_json, processing_cursor, batch_size
    ) VALUES (?, 'queued', ?, NULL, NULL, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, NULL, NULL, 0, 8)`,
    args: [
      args.id,
      now,
      args.origin.latitude,
      args.origin.longitude,
      args.radiusMeters,
      args.limit,
      args.source ?? "open-data",
    ],
  });

  return (
    await getLeadScanJob(args.id)
  ) as LeadScanJob;
}

export async function updateLeadScanJob(
  jobId: string,
  patch: Partial<{
    status: LeadScanJob["status"];
    startedAt: string | null;
    completedAt: string | null;
    totalCandidates: number;
    processedCandidates: number;
    resultCount: number;
    partial: boolean;
    scanDurationMs: number;
    failureReason: string | null;
    candidatesJson: string | null;
    processingCursor: number;
    batchSize: number;
    source: string;
  }>,
): Promise<LeadScanJob | null> {
  await ensureLeadDatabase();
  const client = await getClient();
  const assignments: string[] = [];
  const values: Array<string | number | bigint | Uint8Array | null> = [];

  const mapField: Record<string, keyof typeof patch> = {
    status: "status",
    started_at: "startedAt",
    completed_at: "completedAt",
    total_candidates: "totalCandidates",
    processed_candidates: "processedCandidates",
    result_count: "resultCount",
    partial: "partial",
    scan_duration_ms: "scanDurationMs",
    failure_reason: "failureReason",
    candidates_json: "candidatesJson",
    processing_cursor: "processingCursor",
    batch_size: "batchSize",
    source: "source",
  };

  for (const [column, patchKey] of Object.entries(mapField)) {
    const value = patch[patchKey];
    if (typeof value === "undefined") continue;

    assignments.push(`${column} = ?`);
    const normalizedValue = typeof value === "boolean" ? (value ? 1 : 0) : value;
    if (
      (column === "candidates_json" || column === "failure_reason") &&
      typeof normalizedValue === "string"
    ) {
      values.push(encryptOptionalSensitiveText(normalizedValue));
      continue;
    }

    values.push(normalizedValue);
  }

  if (assignments.length === 0) {
    return getLeadScanJob(jobId);
  }

  await client.execute({
    sql: `UPDATE lead_scan_runs SET ${assignments.join(", ")} WHERE id = ?`,
    args: [...values, jobId],
  });

  return getLeadScanJob(jobId);
}

export async function loadLeadStoreSnapshot(jobId?: string): Promise<LeadStore> {
  await ensureLeadDatabase();
  const client = await getClient();
  const latestJob = jobId
    ? await getJobRowById(client, jobId)
    : await getLatestJobRow(client);

  if (!latestJob) {
    return defaultStore();
  }

  const leadResult = await client.execute({
    sql: `SELECT * FROM leads WHERE last_run_id = ? ORDER BY
      CASE
        WHEN website_status = 'verified' OR email_status = 'verified' OR phone_status = 'verified' THEN 2
        WHEN website_status = 'inferred' OR email_status = 'inferred' OR phone_status = 'inferred' THEN 1
        ELSE 0
      END DESC,
      overall_score DESC,
      help_score DESC,
      ease_score DESC,
      proximity_score DESC,
      distance_miles ASC`,
    args: [latestJob.id],
  });

  const recentJobs = await listLeadScanJobs(8);
  const leads = leadResult.rows.map((row) => mapLeadRow(row as unknown as LeadRow));

  return {
    updatedAt: latestJob.completedAt ?? latestJob.startedAt ?? latestJob.createdAt,
    source: "overpass",
    radiusMeters: latestJob.radiusMeters,
    limit: latestJob.limit,
    resultCount: leads.length,
    origin: latestJob.origin,
    partial: latestJob.partial,
    scanDurationMs: latestJob.scanDurationMs,
    job: latestJob,
    recentJobs,
    leads,
  };
}

export async function replaceLeadSnapshot(store: LeadStore): Promise<void> {
  await ensureLeadDatabase();
  const client = await getClient();
  const jobId = store.job?.id ?? `snapshot-${Date.now()}`;
  const now = store.updatedAt ?? new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO lead_scan_runs (
      id, status, created_at, started_at, completed_at,
      origin_lat, origin_lng, radius_meters, limit_count, source,
      total_candidates, processed_candidates, result_count, partial, scan_duration_ms,
      failure_reason, candidates_json, processing_cursor, batch_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      started_at = excluded.started_at,
      completed_at = excluded.completed_at,
      origin_lat = excluded.origin_lat,
      origin_lng = excluded.origin_lng,
      radius_meters = excluded.radius_meters,
      limit_count = excluded.limit_count,
      source = excluded.source,
      total_candidates = excluded.total_candidates,
      processed_candidates = excluded.processed_candidates,
      result_count = excluded.result_count,
      partial = excluded.partial,
      scan_duration_ms = excluded.scan_duration_ms,
      failure_reason = excluded.failure_reason`,
    args: [
      jobId,
      store.partial ? "completed" : "completed",
      now,
      now,
      now,
      store.origin.latitude,
      store.origin.longitude,
      store.radiusMeters,
      store.limit,
      store.source,
      store.leads.length,
      store.leads.length,
      store.resultCount,
      store.partial ? 1 : 0,
      store.scanDurationMs ?? 0,
      null,
      encryptOptionalSensitiveText(JSON.stringify([])),
      store.leads.length,
      8,
    ],
  });

  for (const lead of store.leads) {
    await upsertLeadRow(client, jobId, lead);
  }
}

export async function updateLeadRecord(
  leadId: string,
  updates: Partial<Pick<BusinessLead, "contacted" | "contactedAt" | "notes" | "website" | "email" | "phone">>,
): Promise<LeadStore> {
  await ensureLeadDatabase();
  const client = await getClient();
  const current = await client.execute({
    sql: `SELECT * FROM leads WHERE id = ? LIMIT 1`,
    args: [leadId],
  });

  const row = current.rows[0] as unknown as LeadRow | undefined;
  if (!row) {
    return loadLeadStoreSnapshot();
  }

  const next: LeadRow = {
    ...row,
    contacted: typeof updates.contacted === "boolean" ? (updates.contacted ? 1 : 0) : row.contacted,
    contacted_at:
      typeof updates.contacted === "boolean"
        ? updates.contacted
          ? row.contacted_at ?? new Date().toISOString()
          : null
        : row.contacted_at,
    notes:
      typeof updates.notes === "string" ? encryptOptionalSensitiveText(updates.notes) : row.notes,
    website:
      typeof updates.website === "string" ? encryptOptionalSensitiveText(updates.website) : row.website,
    email: typeof updates.email === "string" ? encryptOptionalSensitiveText(updates.email) : row.email,
    phone: typeof updates.phone === "string" ? encryptOptionalSensitiveText(updates.phone) : row.phone,
  };

  await client.execute({
    sql: `UPDATE leads SET
      contacted = ?,
      contacted_at = ?,
      notes = ?,
      website = ?,
      email = ?,
      phone = ?
    WHERE id = ?`,
    args: [
      next.contacted,
      next.contacted_at,
      next.notes,
      next.website,
      next.email,
      next.phone,
      leadId,
    ],
  });

  await insertLeadActivity(client, leadId, "update", {
    contacted: updates.contacted,
    notes: updates.notes,
    website: updates.website,
    email: updates.email,
    phone: updates.phone,
  });

  return loadLeadStoreSnapshot();
}

export async function upsertLeadRows(runId: string, leads: BusinessLead[]): Promise<void> {
  await ensureLeadDatabase();
  const client = await getClient();

  for (const lead of leads) {
    await upsertLeadRow(client, runId, lead);
  }
}

export async function getLeadsForRun(runId: string): Promise<BusinessLead[]> {
  await ensureLeadDatabase();
  const client = await getClient();
  const result = await client.execute({
    sql: `SELECT * FROM leads WHERE last_run_id = ? ORDER BY
      CASE
        WHEN website_status = 'verified' OR email_status = 'verified' OR phone_status = 'verified' THEN 2
        WHEN website_status = 'inferred' OR email_status = 'inferred' OR phone_status = 'inferred' THEN 1
        ELSE 0
      END DESC,
      overall_score DESC,
      help_score DESC,
      ease_score DESC,
      proximity_score DESC,
      distance_miles ASC`,
    args: [runId],
  });

  return result.rows.map((row) => mapLeadRow(row as unknown as LeadRow));
}

export async function getLeadById(leadId: string): Promise<BusinessLead | null> {
  await ensureLeadDatabase();
  const client = await getClient();
  const result = await client.execute({
    sql: `SELECT * FROM leads WHERE id = ? LIMIT 1`,
    args: [leadId],
  });
  const row = result.rows[0] as unknown as LeadRow | undefined;
  return row ? mapLeadRow(row) : null;
}

export async function listLeadActivities(leadId: string, limit = 20): Promise<LeadActivity[]> {
  await ensureLeadDatabase();
  const client = await getClient();
  const result = await client.execute({
    sql: `SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [leadId, limit],
  });

  return result.rows.map((row) => {
    const activity = row as unknown as LeadActivityRow;
    return {
      id: activity.id,
      leadId: activity.lead_id,
      type: activity.type,
      detail: activity.detail_json
        ? parseJsonObject<Record<string, unknown>>(decryptSensitiveText(activity.detail_json) ?? activity.detail_json)
        : null,
      createdAt: activity.created_at,
    };
  });
}

export async function setJobCandidates(jobId: string, candidates: unknown[]): Promise<void> {
  await updateLeadScanJob(jobId, {
    candidatesJson: JSON.stringify(candidates),
    totalCandidates: candidates.length,
  });
}

export async function upsertLeadActivityForBatch(
  runId: string,
  leads: BusinessLead[],
): Promise<void> {
  await ensureLeadDatabase();
  const client = await getClient();
  for (const lead of leads) {
    await insertLeadActivity(client, lead.id, "scan", {
      runId,
      overallScore: lead.overallScore,
      websiteStatus: lead.websiteStatus,
      contactStatuses: {
        website: lead.websiteStatus,
        email: lead.emailStatus,
        phone: lead.phoneStatus,
      },
      reasons: lead.rankReasons,
    });
  }
}

async function getLatestJobRow(client: Client): Promise<LeadScanJob | null> {
  const result = await client.execute({
    sql: `SELECT * FROM lead_scan_runs ORDER BY created_at DESC LIMIT 1`,
  });
  const row = result.rows[0] as unknown as LeadScanRunRow | undefined;
  return row ? mapJobRow(row) : null;
}

async function getJobRowById(client: Client, id: string): Promise<LeadScanJob | null> {
  const result = await client.execute({
    sql: `SELECT * FROM lead_scan_runs WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0] as unknown as LeadScanRunRow | undefined;
  return row ? mapJobRow(row) : null;
}

function mapJobRow(row: LeadScanRunRow): LeadScanJob {
  const processed = Number(row.processed_candidates ?? 0);
  const total = Number(row.total_candidates ?? 0);
  return {
    id: row.id,
    status: row.status as LeadScanJob["status"],
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    origin: {
      latitude: Number(row.origin_lat),
      longitude: Number(row.origin_lng),
    },
    radiusMeters: Number(row.radius_meters),
    limit: Number(row.limit_count),
    source: row.source,
    totalCandidates: total,
    processedCandidates: processed,
    resultCount: Number(row.result_count ?? 0),
    partial: Boolean(row.partial),
    scanDurationMs: Number(row.scan_duration_ms ?? 0),
    failureReason: decryptSensitiveText(row.failure_reason),
    progress: total > 0 ? Math.round((processed / total) * 100) : 0,
    candidatesJson: decryptSensitiveText(row.candidates_json),
    processingCursor: Number(row.processing_cursor ?? 0),
    batchSize: Number(row.batch_size ?? 8),
  };
}

function mapLeadRow(row: LeadRow): BusinessLead {
  const websiteSignals = parseJsonArray(row.website_signals_json);
  const aiSignals = parseJsonArray(row.ai_signals_json);
  const rankReasons = parseJsonArray(row.rank_reasons_json) as LeadRankReason[];
  const evidence = parseJsonObject(row.evidence_json) as LeadEvidenceBundle;
  const tags = parseJsonArray(row.tags_json);

  return {
    id: row.id,
    osmType: row.osm_type,
    osmId: Number(row.osm_id),
    name: row.name,
    category: row.category,
    businessType: row.business_type,
    niche: row.niche,
    recommendation: row.recommendation,
    summary: row.summary,
    website: decryptSensitiveText(row.website),
    websiteHost: row.website_host,
    websiteStatus: row.website_status as BusinessLead["websiteStatus"],
    websiteSource: row.website_source,
    websiteConfidence: Number(row.website_confidence ?? 0),
    websiteScore: Number(row.website_score ?? 0),
    websiteQualityScore: Number(row.website_score ?? 0),
    websiteOpportunityScore: Number(row.website_opportunity_score ?? 0),
    websiteSignals: websiteSignals.filter((value): value is string => typeof value === "string"),
    aiMention: Boolean(row.ai_mention),
    aiSignals: aiSignals.filter((value): value is string => typeof value === "string"),
    aiSource: row.ai_source,
    email: decryptSensitiveText(row.email),
    emailStatus: row.email_status as BusinessLead["emailStatus"],
    emailSource: row.email_source,
    phone: decryptSensitiveText(row.phone),
    phoneStatus: row.phone_status as BusinessLead["phoneStatus"],
    phoneSource: row.phone_source,
    address: decryptSensitiveText(row.address),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distanceMiles: Number(row.distance_miles),
    helpScore: Number(row.help_score ?? 0),
    helpPotentialScore: Number(row.help_potential_score ?? row.help_score ?? 0),
    easeScore: Number(row.ease_score ?? 0),
    easeOfHelpScore: Number(row.ease_of_help_score ?? row.ease_score ?? 0),
    proximityScore: Number(row.proximity_score ?? 0),
    overallScore: Number(row.overall_score ?? 0),
    discoveryConfidence: Number(row.discovery_confidence ?? 0),
    rankReasons,
    evidence,
    tags: tags.filter((value): value is string => typeof value === "string"),
    source: row.source,
    lastCheckedAt: row.last_checked_at,
    contacted: Boolean(row.contacted),
    contactedAt: row.contacted_at,
    notes: decryptSensitiveText(row.notes) ?? "",
  };
}

async function upsertLeadRow(client: Client, runId: string, lead: BusinessLead) {
  const websiteStatus = lead.websiteStatus ?? (lead.website ? "verified" : "missing");
  const emailStatus = lead.emailStatus ?? (lead.email ? "verified" : "missing");
  const phoneStatus = lead.phoneStatus ?? (lead.phone ? "verified" : "missing");
  const websiteConfidence = lead.websiteConfidence ?? (lead.website ? 70 : 0);
  const websiteScore = lead.websiteScore ?? lead.websiteQualityScore ?? 0;
  const helpScore = lead.helpScore ?? lead.helpPotentialScore ?? 0;
  const easeScore = lead.easeScore ?? lead.easeOfHelpScore ?? 0;
  const discoveryConfidence = lead.discoveryConfidence ?? 0;
  const websiteSignals = lead.websiteSignals ?? [];
  const aiSignals = lead.aiSignals ?? [];
  const rankReasons = lead.rankReasons ?? [];
  const evidence = lead.evidence ?? null;
  const tags = lead.tags ?? [];
  const source = lead.source ?? "osm";
  const lastCheckedAt = lead.lastCheckedAt ?? new Date().toISOString();
  const contacted = Boolean(lead.contacted);
  const contactedAt = lead.contactedAt ?? null;
  const notes = encryptOptionalSensitiveText(lead.notes ?? "");
  const websiteHost = lead.websiteHost ?? safeHostname(lead.website);
  const website = encryptOptionalSensitiveText(lead.website);
  const email = encryptOptionalSensitiveText(lead.email);
  const phone = encryptOptionalSensitiveText(lead.phone);
  const address = encryptOptionalSensitiveText(lead.address);

  await client.execute({
    sql: `INSERT INTO leads (
      id, last_run_id, osm_type, osm_id, name, category, business_type, niche, recommendation, summary,
      website, website_host, website_status, website_source, website_confidence, website_score,
      website_opportunity_score, website_signals_json, ai_mention, ai_signals_json, ai_source,
      email, email_status, email_source, phone, phone_status, phone_source, address,
      latitude, longitude, distance_miles, help_score, help_potential_score, ease_score,
      ease_of_help_score, proximity_score, overall_score, discovery_confidence, rank_reasons_json,
      evidence_json, tags_json, source, last_checked_at, contacted, contacted_at, notes
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      last_run_id = excluded.last_run_id,
      osm_type = excluded.osm_type,
      osm_id = excluded.osm_id,
      name = excluded.name,
      category = excluded.category,
      business_type = excluded.business_type,
      niche = excluded.niche,
      recommendation = excluded.recommendation,
      summary = excluded.summary,
      website = excluded.website,
      website_host = excluded.website_host,
      website_status = excluded.website_status,
      website_source = excluded.website_source,
      website_confidence = excluded.website_confidence,
      website_score = excluded.website_score,
      website_opportunity_score = excluded.website_opportunity_score,
      website_signals_json = excluded.website_signals_json,
      ai_mention = excluded.ai_mention,
      ai_signals_json = excluded.ai_signals_json,
      ai_source = excluded.ai_source,
      email = excluded.email,
      email_status = excluded.email_status,
      email_source = excluded.email_source,
      phone = excluded.phone,
      phone_status = excluded.phone_status,
      phone_source = excluded.phone_source,
      address = excluded.address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      distance_miles = excluded.distance_miles,
      help_score = excluded.help_score,
      help_potential_score = excluded.help_potential_score,
      ease_score = excluded.ease_score,
      ease_of_help_score = excluded.ease_of_help_score,
      proximity_score = excluded.proximity_score,
      overall_score = excluded.overall_score,
      discovery_confidence = excluded.discovery_confidence,
      rank_reasons_json = excluded.rank_reasons_json,
      evidence_json = excluded.evidence_json,
      tags_json = excluded.tags_json,
      source = excluded.source,
      last_checked_at = excluded.last_checked_at,
      contacted = CASE
        WHEN leads.contacted_at IS NOT NULL AND leads.contacted = 1 THEN 1
        ELSE excluded.contacted
      END,
      contacted_at = COALESCE(leads.contacted_at, excluded.contacted_at),
      notes = COALESCE(leads.notes, excluded.notes)`,
    args: [
      lead.id,
      runId,
      lead.osmType,
      lead.osmId,
      lead.name,
      lead.category,
      lead.businessType,
      lead.niche,
      lead.recommendation,
      lead.summary,
      website,
      websiteHost,
      websiteStatus,
      lead.websiteSource ?? null,
      websiteConfidence,
      websiteScore,
      lead.websiteOpportunityScore ?? Math.max(0, Math.min(100, 100 - websiteScore)),
      JSON.stringify(websiteSignals),
      lead.aiMention ? 1 : 0,
      JSON.stringify(aiSignals),
      lead.aiSource ?? null,
      email,
      emailStatus,
      lead.emailSource ?? null,
      phone,
      phoneStatus,
      lead.phoneSource ?? null,
      address,
      lead.latitude,
      lead.longitude,
      lead.distanceMiles,
      helpScore,
      lead.helpPotentialScore ?? helpScore,
      easeScore,
      lead.easeOfHelpScore ?? easeScore,
      lead.proximityScore,
      lead.overallScore,
      discoveryConfidence,
      JSON.stringify(rankReasons),
      JSON.stringify(evidence),
      JSON.stringify(tags),
      source,
      lastCheckedAt,
      contacted ? 1 : 0,
      contactedAt,
      notes,
    ],
  });
}

function safeHostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function insertLeadActivity(client: Client, leadId: string, type: string, detail: unknown) {
  await client.execute({
    sql: `INSERT INTO lead_activities (id, lead_id, type, detail_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [
      `activity-${leadId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      leadId,
      type,
      encryptOptionalSensitiveText(JSON.stringify(detail)),
      new Date().toISOString(),
    ],
  });
}

function parseJsonArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T>(value: string | null): T {
  if (!value) return {} as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
}

function defaultStore(): LeadStore {
  return {
    updatedAt: new Date().toISOString(),
    source: "overpass",
    radiusMeters: DEFAULT_SCAN_RADIUS_METERS,
    limit: DEFAULT_SCAN_LIMIT,
    resultCount: 0,
    origin: DEFAULT_ORIGIN,
    partial: false,
    scanDurationMs: 0,
    job: null,
    recentJobs: [],
    leads: [],
  };
}
