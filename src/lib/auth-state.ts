import { createHash, randomBytes } from "crypto";
import { createClient, type Client } from "@libsql/client";
import { mkdir } from "fs/promises";
import path from "path";

export type AuthSessionScope = "admin" | "venus-sync" | "venus-web";

type RateLimitRow = {
  bucket_key: string;
  count: number;
  reset_at: number;
};

type PersistedSession = {
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  metadata: Record<string, unknown>;
  scope: AuthSessionScope;
  subject: string;
  tokenHash: string;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const LOCAL_DB_PATH = path.join(DATA_DIR, "auth-state.db").replace(/\\/g, "/");
const DEFAULT_DB_URL = `file:${LOCAL_DB_PATH}`;

let clientPromise: Promise<Client> | null = null;
let initPromise: Promise<void> | null = null;
let warnedVerificationFailure = false;

function authDbUrl() {
  const configured = process.env.AUTH_STATE_DATABASE_URL?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_STATE_DATABASE_URL must be set in production.");
  }

  return DEFAULT_DB_URL;
}

function authDbAuthToken() {
  const configured = process.env.AUTH_STATE_DATABASE_AUTH_TOKEN?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production" && !authDbUrl().startsWith("file:")) {
    throw new Error("AUTH_STATE_DATABASE_AUTH_TOKEN must be set in production for a remote auth database.");
  }

  return undefined;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = Promise.resolve(
      createClient({
        authToken: authDbAuthToken(),
        url: authDbUrl(),
      }),
    );
  }

  return clientPromise;
}

function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseSessionRow(row: Record<string, unknown> | undefined): PersistedSession | null {
  if (!row) {
    return null;
  }

  const scope = row.scope;
  const subject = row.subject;
  const tokenHash = row.token_hash;

  if (
    (scope !== "admin" && scope !== "venus-sync" && scope !== "venus-web") ||
    typeof subject !== "string" ||
    typeof tokenHash !== "string"
  ) {
    return null;
  }

  let metadata: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(typeof row.metadata_json === "string" ? row.metadata_json : "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      metadata = parsed as Record<string, unknown>;
    }
  } catch {
    metadata = {};
  }

  return {
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : new Date(0).toISOString(),
    lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : new Date(0).toISOString(),
    metadata,
    scope,
    subject,
    tokenHash,
  };
}

function parseRateLimitRow(row: Record<string, unknown> | undefined): RateLimitRow | null {
  if (!row || typeof row.bucket_key !== "string") {
    return null;
  }

  return {
    bucket_key: row.bucket_key,
    count: toNumber(row.count, 0),
    reset_at: toNumber(row.reset_at, 0),
  };
}

function logVerificationFailure(error: unknown) {
  if (warnedVerificationFailure) {
    return;
  }

  warnedVerificationFailure = true;
  console.error("[auth-state] session verification unavailable; denying access.", error);
}

async function initializeAuthStateDatabase() {
  await mkdir(DATA_DIR, { recursive: true });
  const client = await getClient();

  const statements = [
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      subject TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      last_seen_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    )`,
    `CREATE INDEX IF NOT EXISTS idx_auth_sessions_scope_subject
      ON auth_sessions(scope, subject)`,
    `CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
      ON auth_sessions(expires_at)`,
    `CREATE TABLE IF NOT EXISTS auth_rate_limits (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_reset_at
      ON auth_rate_limits(reset_at)`,
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }
}

export async function ensureAuthStateDatabase() {
  if (!initPromise) {
    initPromise = initializeAuthStateDatabase();
  }

  return initPromise;
}

export function generateOpaqueSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createAuthSession(args: {
  metadata?: Record<string, unknown>;
  scope: AuthSessionScope;
  subject: string;
  ttlMs: number;
}) {
  await ensureAuthStateDatabase();

  const token = generateOpaqueSessionToken();
  const tokenHash = hashOpaqueToken(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + args.ttlMs).toISOString();
  const client = await getClient();

  await client.execute({
    args: [
      tokenHash,
      args.scope,
      args.subject,
      createdAt,
      expiresAt,
      createdAt,
      JSON.stringify(args.metadata ?? {}),
    ],
    sql: `INSERT INTO auth_sessions (
      token_hash,
      scope,
      subject,
      created_at,
      expires_at,
      last_seen_at,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  });

  return {
    createdAt,
    expiresAt,
    token,
  };
}

export async function verifyAuthSessionToken(
  token: string | null | undefined,
  options: {
    scope: AuthSessionScope;
    subject?: string;
    touch?: boolean;
  },
) {
  if (!token) {
    return null;
  }

  try {
    await ensureAuthStateDatabase();

    const client = await getClient();
    const tokenHash = hashOpaqueToken(token);
    const result = await client.execute({
      args: [tokenHash],
      sql: `SELECT
        token_hash,
        scope,
        subject,
        created_at,
        expires_at,
        revoked_at,
        last_seen_at,
        metadata_json
      FROM auth_sessions
      WHERE token_hash = ?
      LIMIT 1`,
    });

    const row = parseSessionRow(result.rows[0] as Record<string, unknown> | undefined);
    const revokedAt = toNullableString((result.rows[0] as Record<string, unknown> | undefined)?.revoked_at);

    if (!row || revokedAt || row.scope !== options.scope) {
      return null;
    }

    if (options.subject && row.subject !== options.subject) {
      return null;
    }

    if (Date.parse(row.expiresAt) <= Date.now()) {
      return null;
    }

    if (options.touch !== false) {
      const lastSeenAt = new Date().toISOString();
      await client.execute({
        args: [lastSeenAt, row.tokenHash],
        sql: `UPDATE auth_sessions
          SET last_seen_at = ?
          WHERE token_hash = ?`,
      });
      row.lastSeenAt = lastSeenAt;
    }

    return row;
  } catch (error) {
    logVerificationFailure(error);
    return null;
  }
}

export async function revokeAuthSessionToken(token: string | null | undefined) {
  if (!token) {
    return;
  }

  await ensureAuthStateDatabase();

  const client = await getClient();
  await client.execute({
    args: [new Date().toISOString(), hashOpaqueToken(token)],
    sql: `UPDATE auth_sessions
      SET revoked_at = ?
      WHERE token_hash = ?
        AND revoked_at IS NULL`,
  });
}

export async function checkPersistentRateLimit(
  bucketKey: string,
  options: { limit: number; windowMs: number },
) {
  await ensureAuthStateDatabase();

  const client = await getClient();
  const now = Date.now();
  const result = await client.execute({
    args: [bucketKey],
    sql: `SELECT bucket_key, count, reset_at
      FROM auth_rate_limits
      WHERE bucket_key = ?
      LIMIT 1`,
  });

  const existing = parseRateLimitRow(result.rows[0] as Record<string, unknown> | undefined);
  const nextResetAt = now + options.windowMs;

  if (!existing || existing.reset_at <= now) {
    await client.execute({
      args: [bucketKey, 1, nextResetAt],
      sql: `INSERT INTO auth_rate_limits (bucket_key, count, reset_at)
        VALUES (?, ?, ?)
        ON CONFLICT(bucket_key) DO UPDATE SET
          count = excluded.count,
          reset_at = excluded.reset_at`,
    });
    return { ok: true, remaining: Math.max(0, options.limit - 1) };
  }

  if (existing.count >= options.limit) {
    return { ok: false, remaining: 0, retryAt: existing.reset_at };
  }

  const nextCount = existing.count + 1;
  await client.execute({
    args: [nextCount, bucketKey],
    sql: `UPDATE auth_rate_limits
      SET count = ?
      WHERE bucket_key = ?`,
  });

  return {
    ok: true,
    remaining: Math.max(0, options.limit - nextCount),
  };
}

export function getAuthSessionMetadata(args: {
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return {
    ipAddress: args.ipAddress?.trim() || null,
    userAgent: args.userAgent?.trim() || null,
  };
}

export function __resetAuthStateForTests() {
  clientPromise = null;
  initPromise = null;
  warnedVerificationFailure = false;
}
