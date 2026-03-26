import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTED_PREFIX = "enc:v1:";
const IV_LENGTH = 12;

let cachedKey: Buffer | null = null;

function getEncryptionSecret() {
  const configured = process.env.LEAD_ENCRYPTION_KEY?.trim();
  if (!configured) {
    throw new Error("LEAD_ENCRYPTION_KEY must be set.");
  }
  return configured;
}

function getEncryptionKey() {
  if (!cachedKey) {
    cachedKey = createHash("sha256").update(getEncryptionSecret(), "utf8").digest();
  }

  return cachedKey;
}

function encodeBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function isEncryptedPayload(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptSensitiveText(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    encodeBase64Url(iv),
    encodeBase64Url(authTag),
    encodeBase64Url(encrypted),
  ].join("");
}

export function encryptOptionalSensitiveText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  if (value.length === 0) {
    return null;
  }

  if (isEncryptedPayload(value)) {
    return value;
  }

  return encryptSensitiveText(value);
}

export function decryptSensitiveText(value: string | null | undefined) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (!isEncryptedPayload(value)) {
    return value;
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [ivPart, tagPart, ciphertextPart] = payload.split(".");

  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Encrypted payload is malformed.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), decodeBase64Url(ivPart));
  decipher.setAuthTag(decodeBase64Url(tagPart));
  const plaintext = Buffer.concat([
    decipher.update(decodeBase64Url(ciphertextPart)),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function encryptSensitiveJson(value: unknown) {
  return encryptSensitiveText(JSON.stringify(value));
}

export function decryptSensitiveJson<T>(value: string | null | undefined) {
  const plaintext = decryptSensitiveText(value);

  if (plaintext === null) {
    return null;
  }

  try {
    return JSON.parse(plaintext) as T;
  } catch {
    throw new Error("Encrypted payload could not be parsed as JSON.");
  }
}
