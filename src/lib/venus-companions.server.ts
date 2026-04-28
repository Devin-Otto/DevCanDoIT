import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type CompanionCharacterId,
  type CompanionOverlaySession,
  type CompanionTriggerEvent,
  type CompanionTriggerType,
  DEFAULT_COMPANION_SESSION,
  DEFAULT_COMPANION_SETTINGS,
  createCompanionTriggerEvent,
  isCompanionCharacterId,
  isCompanionSessionActive,
  isCompanionTriggerType,
  normalizeCompanionSession,
  normalizeCompanionSettings
} from "@/lib/venus-companions";
import { getVenusSyncDataRoot, loadVenusSyncDocument } from "@/lib/venus-sync.server";

const MAX_TRIGGER_COUNT = 48;
const MAX_TRIGGER_AGE_MS = 2 * 60 * 60 * 1000;
const SESSION_DURATION_MS = 60 * 60 * 1000;

function getCompanionRuntimeRoot() {
  return path.join(getVenusSyncDataRoot(), "companions");
}

function getCompanionSessionPath() {
  return path.join(getCompanionRuntimeRoot(), "session.json");
}

function getCompanionTriggersPath() {
  return path.join(getCompanionRuntimeRoot(), "triggers.json");
}

async function writeJsonFile(filePath: string, value: unknown) {
  const directory = path.dirname(filePath);
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  await mkdir(directory, { recursive: true });
  await writeFile(tempPath, JSON.stringify(value, null, 2));
  await rename(tempPath, filePath);
}

function pruneTriggers(triggers: CompanionTriggerEvent[]) {
  const minimumAt = Date.now() - MAX_TRIGGER_AGE_MS;
  return triggers
    .filter((trigger) => Date.parse(trigger.at) >= minimumAt && isCompanionTriggerType(trigger.trigger))
    .slice(-MAX_TRIGGER_COUNT);
}

function normalizeTrigger(value: unknown): CompanionTriggerEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<CompanionTriggerEvent>;
  if (!isCompanionTriggerType(input.trigger) || typeof input.id !== "string" || typeof input.at !== "string") {
    return null;
  }

  return {
    at: input.at,
    id: input.id,
    note: typeof input.note === "string" ? input.note : undefined,
    source: input.source === "desktop" || input.source === "website" ? input.source : "manual",
    trigger: input.trigger
  };
}

export async function loadCompanionSession() {
  try {
    const text = await readFile(getCompanionSessionPath(), "utf8");
    const parsed = JSON.parse(text) as unknown;
    const normalized = normalizeCompanionSession(parsed as Partial<CompanionOverlaySession>);
    if (!isCompanionSessionActive(normalized)) {
      return normalized.enabled ? await saveCompanionSession({ ...normalized, enabled: false, expiresAt: undefined }) : normalized;
    }
    return normalized;
  } catch {
    return DEFAULT_COMPANION_SESSION;
  }
}

export async function saveCompanionSession(input: Partial<CompanionOverlaySession>) {
  const normalized = normalizeCompanionSession({
    ...input,
    lastUpdatedAt: new Date().toISOString()
  });
  await writeJsonFile(getCompanionSessionPath(), normalized);
  return normalized;
}

export async function loadCompanionTriggers() {
  try {
    const text = await readFile(getCompanionTriggersPath(), "utf8");
    const parsed = JSON.parse(text) as unknown;
    const triggers = Array.isArray(parsed) ? parsed.map(normalizeTrigger).filter((value): value is CompanionTriggerEvent => Boolean(value)) : [];
    const pruned = pruneTriggers(triggers);
    if (pruned.length !== triggers.length) {
      await writeJsonFile(getCompanionTriggersPath(), pruned);
    }
    return pruned;
  } catch {
    return [] as CompanionTriggerEvent[];
  }
}

export async function saveCompanionTriggers(triggers: CompanionTriggerEvent[]) {
  const pruned = pruneTriggers(triggers);
  await writeJsonFile(getCompanionTriggersPath(), pruned);
  return pruned;
}

export async function appendCompanionTrigger(input: {
  note?: string;
  source: CompanionTriggerEvent["source"];
  trigger: CompanionTriggerType;
}) {
  const session = await loadCompanionSession();
  if (!isCompanionSessionActive(session)) {
    return null;
  }

  const nextTrigger = createCompanionTriggerEvent(input.trigger, input.source, input.note);
  const existing = await loadCompanionTriggers();
  await saveCompanionTriggers([...existing, nextTrigger]);
  return nextTrigger;
}

export async function setCompanionSessionEnabled(input: {
  enabled: boolean;
  enabledCharacterIds?: CompanionCharacterId[];
}) {
  const current = await loadCompanionSession();
  const now = new Date();
  const enabledCharacterIds = Array.isArray(input.enabledCharacterIds)
    ? input.enabledCharacterIds.filter(isCompanionCharacterId)
    : current.enabledCharacterIds;

  const session = await saveCompanionSession({
    activatedAt: input.enabled ? now.toISOString() : current.activatedAt,
    enabled: input.enabled,
    enabledCharacterIds: enabledCharacterIds.length ? enabledCharacterIds : current.enabledCharacterIds,
    expiresAt: input.enabled ? new Date(now.getTime() + SESSION_DURATION_MS).toISOString() : undefined,
    streamOnlyMode: current.streamOnlyMode
  });

  return session;
}

export async function getCompanionRemoteState(cursor?: string) {
  const document = await loadVenusSyncDocument();
  const companions = normalizeCompanionSettings(document.preferences?.companions ?? DEFAULT_COMPANION_SETTINGS);
  const session = await loadCompanionSession();
  const allTriggers = await loadCompanionTriggers();
  const latestCursor = allTriggers[allTriggers.length - 1]?.id;
  const startIndex = cursor ? allTriggers.findIndex((trigger) => trigger.id === cursor) : -1;
  const triggers = startIndex >= 0 ? allTriggers.slice(startIndex + 1) : allTriggers;

  return {
    companions,
    cursor: latestCursor,
    session,
    triggers
  };
}
