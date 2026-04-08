export const VENUS_COOKIE_NAME = "devcandoit_venus_session";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function getSessionSecret() {
  const secret = process.env.VENUS_GATE_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("VENUS_GATE_SESSION_SECRET or ADMIN_SESSION_SECRET must be set.");
  }

  return secret;
}

export function isVenusGateConfigured() {
  return Boolean(process.env.VENUS_GATE_USERNAME?.trim() && process.env.VENUS_GATE_PASSWORD?.trim());
}

export function getVenusUsername() {
  const username = process.env.VENUS_GATE_USERNAME?.trim();
  if (!username) {
    throw new Error("VENUS_GATE_USERNAME must be set.");
  }

  return username;
}

function getVenusPassword() {
  const password = process.env.VENUS_GATE_PASSWORD;
  if (!password) {
    throw new Error("VENUS_GATE_PASSWORD must be set.");
  }

  return password;
}

function normalizeUsername(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = 4 - (base64.length % 4 || 4);
  const normalized = `${base64}${"=".repeat(padding === 4 ? 0 : padding)}`;
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSessionKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(value: string) {
  const key = await getSessionKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function issueVenusSessionToken(username: string): Promise<string> {
  const payload = {
    expiresAt: Date.now() + DEFAULT_SESSION_TTL_MS,
    issuedAt: Date.now(),
    nonce: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(8))),
    username
  };

  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encoded);
  return `${encoded}.${signature}`;
}

export async function verifyVenusSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || !isVenusGateConfigured()) {
    return false;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return false;
  }

  const key = await getSessionKey();
  const signatureBytes = base64UrlToBytes(signature);
  const verified = await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(encoded));

  if (!verified) {
    return false;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as {
      expiresAt?: number;
      username?: string;
    };

    if (normalizeUsername(payload.username) !== normalizeUsername(getVenusUsername())) {
      return false;
    }

    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function verifyVenusCredentials(username: string, password: string) {
  if (!isVenusGateConfigured()) {
    return false;
  }

  return normalizeUsername(username) === normalizeUsername(getVenusUsername()) && password === getVenusPassword();
}
