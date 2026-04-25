import { createAuthSession, revokeAuthSessionToken, verifyAuthSessionToken } from "@/lib/auth-state";

export const ADMIN_COOKIE_NAME = "devcandoit_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function normalizeUsername(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function getAdminCookieDomain() {
  return process.env.ADMIN_COOKIE_DOMAIN?.trim() || undefined;
}

export function getAdminUsername() {
  const username = process.env.ADMIN_USERNAME?.trim();
  if (!username) {
    throw new Error("ADMIN_USERNAME must be set.");
  }

  return username;
}

export async function issueAdminSessionToken(
  username: string,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const session = await createAuthSession({
    metadata,
    scope: "admin",
    subject: normalizeUsername(username),
    ttlMs: ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  });

  return session.token;
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  const session = await verifyAuthSessionToken(token, {
    scope: "admin",
    subject: normalizeUsername(getAdminUsername()),
  });
  return Boolean(session);
}

export async function revokeAdminSessionToken(token: string | undefined | null) {
  await revokeAuthSessionToken(token);
}
