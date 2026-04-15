import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const FIREBASE_APP_NAME = "devcandoit-telemidi";

type ServiceAccountShape = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  let parsed: ServiceAccountShape;
  try {
    parsed = JSON.parse(raw) as ServiceAccountShape;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  if (!parsed.projectId || !parsed.clientEmail || !parsed.privateKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service account fields.");
  }

  return {
    ...parsed,
    privateKey: parsed.privateKey.replace(/\\n/g, "\n"),
  };
}

function getTelemidiFirebaseApp() {
  const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);
  if (existing) {
    return getApp(FIREBASE_APP_NAME);
  }

  return initializeApp(
    {
      credential: cert(readServiceAccount()),
    },
    FIREBASE_APP_NAME,
  );
}

export function getTelemidiAdminAuth() {
  return getAuth(getTelemidiFirebaseApp());
}

export function getTelemidiAdminDb() {
  return getFirestore(getTelemidiFirebaseApp());
}
