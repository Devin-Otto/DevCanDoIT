import { createHash, randomBytes } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getTelemidiAdminAuth, getTelemidiAdminDb } from "@/lib/telemidi-firebase.server";

const SESSION_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomFromAlphabet(length: number, alphabet: string) {
  const bytes = randomBytes(length);
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += alphabet[bytes[index] % alphabet.length];
  }
  return value;
}

export function normalizeTelemidiSessionId(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

export function normalizeTelemidiJoinCode(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export function sanitizeDisplayName(value: unknown, fallback: string) {
  const trimmed = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return trimmed.slice(0, 40) || fallback;
}

function hashJoinCode(joinCode: string) {
  return createHash("sha256").update(joinCode).digest("hex");
}

export async function verifyTelemidiIdToken(idToken: string) {
  return getTelemidiAdminAuth().verifyIdToken(idToken);
}

export async function createTelemidiSession(options: { uid: string; displayName: string }) {
  const db = getTelemidiAdminDb();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const sessionId = randomFromAlphabet(8, SESSION_ID_ALPHABET);
    const joinCode = randomFromAlphabet(6, JOIN_CODE_ALPHABET);
    const sessionRef = db.collection("sessions").doc(sessionId);
    const existing = await sessionRef.get();
    if (existing.exists) {
      continue;
    }

    const batch = db.batch();
    batch.set(sessionRef, {
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      hostHeartbeatMs: Date.now(),
      hostName: options.displayName,
      hostOnline: true,
      hostUid: options.uid,
      kind: "telemidi-session",
      status: "active",
    });
    batch.set(sessionRef.collection("members").doc(options.uid), {
      displayName: options.displayName,
      joinedAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
      role: "host",
      uid: options.uid,
    });
    batch.set(sessionRef.collection("private").doc("access"), {
      createdAt: FieldValue.serverTimestamp(),
      joinCodeHash: hashJoinCode(joinCode),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return { joinCode, sessionId };
  }

  throw new Error("Unable to allocate a unique TeleMIDI session ID.");
}

export async function joinTelemidiSession(options: {
  uid: string;
  displayName: string;
  sessionId: string;
  joinCode: string;
}) {
  const db = getTelemidiAdminDb();
  const sessionId = normalizeTelemidiSessionId(options.sessionId);
  const joinCode = normalizeTelemidiJoinCode(options.joinCode);

  if (!sessionId || !joinCode) {
    throw new Error("Session ID and join code are required.");
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const [sessionSnap, accessSnap] = await Promise.all([
    sessionRef.get(),
    sessionRef.collection("private").doc("access").get(),
  ]);

  if (!sessionSnap.exists || !accessSnap.exists) {
    throw new Error("Session not found.");
  }

  const session = sessionSnap.data() || {};
  const expectedHash = accessSnap.get("joinCodeHash");
  if (!expectedHash || expectedHash !== hashJoinCode(joinCode)) {
    throw new Error("Invalid join code.");
  }

  if (session.hostUid === options.uid) {
    return { role: "host" as const, sessionId };
  }

  await sessionRef.collection("members").doc(options.uid).set(
    {
      displayName: options.displayName,
      joinedAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
      role: "remote",
      uid: options.uid,
    },
    { merge: true },
  );

  return { role: "remote" as const, sessionId };
}
