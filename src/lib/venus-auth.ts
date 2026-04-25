import { scryptSync, timingSafeEqual } from "crypto";

import { createAuthSession, revokeAuthSessionToken, verifyAuthSessionToken } from "@/lib/auth-state";

export const VENUS_COOKIE_NAME = "devcandoit_venus_session";
export const VENUS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const VENUS_SYNC_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

let warnedLegacyPassword = false;

function normalizeUsername(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getVenusPasswordSalt() {
  return process.env.VENUS_GATE_PASSWORD_SALT?.trim() || null;
}

function getVenusPasswordHash() {
  return process.env.VENUS_GATE_PASSWORD_HASH?.trim() || null;
}

function getLegacyVenusPassword() {
  return process.env.VENUS_GATE_PASSWORD || null;
}

function hasHashedVenusCredentials() {
  return Boolean(getVenusPasswordSalt() && getVenusPasswordHash());
}

function hasLegacyVenusCredentials() {
  return Boolean(getLegacyVenusPassword());
}

function warnLegacyPasswordOnce() {
  if (warnedLegacyPassword) {
    return;
  }

  warnedLegacyPassword = true;
  console.warn("VENUS_GATE_PASSWORD is deprecated. Configure VENUS_GATE_PASSWORD_SALT and VENUS_GATE_PASSWORD_HASH.");
}

function hashVenusPassword(password: string) {
  const salt = getVenusPasswordSalt();
  if (!salt) {
    throw new Error("VENUS_GATE_PASSWORD_SALT must be set.");
  }

  return scryptSync(password, salt, 64);
}

export function isVenusGateConfigured() {
  return Boolean(process.env.VENUS_GATE_USERNAME?.trim() && (hasHashedVenusCredentials() || hasLegacyVenusCredentials()));
}

export function getVenusUsername() {
  const username = process.env.VENUS_GATE_USERNAME?.trim();
  if (!username) {
    throw new Error("VENUS_GATE_USERNAME must be set.");
  }

  return username;
}

export async function issueVenusSessionToken(
  username: string,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const session = await createAuthSession({
    metadata,
    scope: "venus-web",
    subject: normalizeUsername(username),
    ttlMs: VENUS_SESSION_MAX_AGE_SECONDS * 1000,
  });

  return session.token;
}

export async function issueVenusDesktopSyncToken(
  username: string,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const session = await createAuthSession({
    metadata,
    scope: "venus-sync",
    subject: normalizeUsername(username),
    ttlMs: VENUS_SYNC_MAX_AGE_SECONDS * 1000,
  });

  return session.token;
}

export async function verifyVenusSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!isVenusGateConfigured()) {
    return false;
  }

  const session = await verifyAuthSessionToken(token, {
    scope: "venus-web",
    subject: normalizeUsername(getVenusUsername()),
  });
  return Boolean(session);
}

export async function verifyVenusDesktopSyncToken(token: string | undefined | null): Promise<boolean> {
  if (!isVenusGateConfigured()) {
    return false;
  }

  const session = await verifyAuthSessionToken(token, {
    scope: "venus-sync",
    subject: normalizeUsername(getVenusUsername()),
  });
  return Boolean(session);
}

export async function revokeVenusSessionToken(token: string | undefined | null) {
  await revokeAuthSessionToken(token);
}

export function verifyVenusCredentials(username: string, password: string) {
  if (!isVenusGateConfigured()) {
    return false;
  }

  if (normalizeUsername(username) !== normalizeUsername(getVenusUsername())) {
    return false;
  }

  if (hasHashedVenusCredentials()) {
    const expectedHash = Buffer.from(getVenusPasswordHash() as string, "hex");
    const candidateHash = hashVenusPassword(password);
    return candidateHash.length === expectedHash.length && timingSafeEqual(candidateHash, expectedHash);
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  warnLegacyPasswordOnce();
  return password === getLegacyVenusPassword();
}
