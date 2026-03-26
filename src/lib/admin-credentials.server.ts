import { scryptSync, timingSafeEqual } from "crypto";

import { getAdminUsername } from "@/lib/admin-auth";

function getPasswordSalt() {
  const salt = process.env.ADMIN_PASSWORD_SALT?.trim();
  if (!salt) {
    throw new Error("ADMIN_PASSWORD_SALT must be set.");
  }
  return salt;
}

function getPasswordHash() {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!hash) {
    throw new Error("ADMIN_PASSWORD_HASH must be set.");
  }
  return hash;
}

function hashPassword(password: string) {
  return scryptSync(password, getPasswordSalt(), 64);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  if (username.trim().toLowerCase() !== getAdminUsername().trim().toLowerCase()) {
    return false;
  }

  const candidate = hashPassword(password);
  const expected = Buffer.from(getPasswordHash(), "hex");

  if (candidate.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(candidate, expected);
}
