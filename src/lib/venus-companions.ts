export type CompanionCharacterId = "donut" | "mrcrabs" | "mark" | "kittylion";
export type CompanionTriggerType =
  | "gift"
  | "follow"
  | "share"
  | "subscribe"
  | "like-milestone"
  | "goal-reached"
  | "inactivity"
  | "manual-test";
export type CompanionResponsePreset =
  | "ignore"
  | "happy"
  | "excited"
  | "love"
  | "curious"
  | "surprised"
  | "sad"
  | "angry"
  | "bored";

export interface CompanionSpriteCatalogEntry {
  id: CompanionCharacterId;
  label: string;
  spriteSheetFileName: string;
}

export interface CompanionCharacterConfig {
  boredomMs: number;
  enabledByDefault: boolean;
  idleMaxMs: number;
  idleMinMs: number;
  reactionDurationMs: number;
  responses: Record<CompanionTriggerType, CompanionResponsePreset>;
  scale: number;
}

export interface CompanionOverlaySettings {
  characters: Record<CompanionCharacterId, CompanionCharacterConfig>;
  spriteCatalog: CompanionSpriteCatalogEntry[];
  stageHeight: number;
  stageWidth: number;
  streamOnlyMode: boolean;
  version: number;
}

export interface CompanionOverlaySession {
  activatedAt?: string;
  enabled: boolean;
  enabledCharacterIds: CompanionCharacterId[];
  expiresAt?: string;
  lastUpdatedAt?: string;
  streamOnlyMode: boolean;
}

export interface CompanionTriggerEvent {
  at: string;
  id: string;
  note?: string;
  source: "desktop" | "manual" | "website";
  trigger: CompanionTriggerType;
}

export const COMPANION_CHARACTER_IDS = ["donut", "mrcrabs", "mark", "kittylion"] as const satisfies CompanionCharacterId[];
export const COMPANION_TRIGGER_TYPES = [
  "gift",
  "follow",
  "share",
  "subscribe",
  "like-milestone",
  "goal-reached",
  "inactivity",
  "manual-test"
] as const satisfies CompanionTriggerType[];
export const COMPANION_RESPONSE_PRESETS = [
  "ignore",
  "happy",
  "excited",
  "love",
  "curious",
  "surprised",
  "sad",
  "angry",
  "bored"
] as const satisfies CompanionResponsePreset[];

export const COMPANION_CATALOG: CompanionSpriteCatalogEntry[] = [
  { id: "donut", label: "Donut", spriteSheetFileName: "donut.png" },
  { id: "mrcrabs", label: "Mr. Crabs", spriteSheetFileName: "mrcrabs.png" },
  { id: "mark", label: "Mark", spriteSheetFileName: "mark.png" },
  { id: "kittylion", label: "Kitty Lion", spriteSheetFileName: "kittylion.png" }
];

const DEFAULT_COMPANION_CHARACTER_RESPONSES: Record<CompanionTriggerType, CompanionResponsePreset> = {
  follow: "happy",
  gift: "excited",
  "goal-reached": "love",
  inactivity: "bored",
  "like-milestone": "curious",
  "manual-test": "happy",
  share: "surprised",
  subscribe: "love"
};

export const DEFAULT_COMPANION_SETTINGS: CompanionOverlaySettings = {
  characters: {
    donut: {
      boredomMs: 95_000,
      enabledByDefault: true,
      idleMaxMs: 8_000,
      idleMinMs: 2_200,
      reactionDurationMs: 5_800,
      responses: { ...DEFAULT_COMPANION_CHARACTER_RESPONSES },
      scale: 1.75
    },
    kittylion: {
      boredomMs: 110_000,
      enabledByDefault: false,
      idleMaxMs: 7_500,
      idleMinMs: 2_000,
      reactionDurationMs: 5_200,
      responses: {
        ...DEFAULT_COMPANION_CHARACTER_RESPONSES,
        "goal-reached": "excited",
        share: "happy"
      },
      scale: 1.55
    },
    mark: {
      boredomMs: 120_000,
      enabledByDefault: false,
      idleMaxMs: 9_000,
      idleMinMs: 2_600,
      reactionDurationMs: 4_800,
      responses: {
        ...DEFAULT_COMPANION_CHARACTER_RESPONSES,
        gift: "happy",
        inactivity: "sad",
        subscribe: "excited"
      },
      scale: 1.55
    },
    mrcrabs: {
      boredomMs: 85_000,
      enabledByDefault: false,
      idleMaxMs: 7_000,
      idleMinMs: 1_800,
      reactionDurationMs: 4_600,
      responses: {
        ...DEFAULT_COMPANION_CHARACTER_RESPONSES,
        "goal-reached": "happy",
        "like-milestone": "excited",
        share: "curious"
      },
      scale: 1.7
    }
  },
  spriteCatalog: COMPANION_CATALOG,
  stageHeight: 720,
  stageWidth: 1280,
  streamOnlyMode: false,
  version: 1
};

export const DEFAULT_COMPANION_SESSION: CompanionOverlaySession = {
  enabled: false,
  enabledCharacterIds: COMPANION_CATALOG.filter((entry) => DEFAULT_COMPANION_SETTINGS.characters[entry.id].enabledByDefault).map(
    (entry) => entry.id
  ),
  streamOnlyMode: false
};

export function getHostedCompanionSpriteSheetUrl(characterId: CompanionCharacterId) {
  const entry = COMPANION_CATALOG.find((catalogEntry) => catalogEntry.id === characterId);
  return entry ? `/venus-companions/sprites/${entry.spriteSheetFileName}` : "";
}

export function isCompanionCharacterId(value: unknown): value is CompanionCharacterId {
  return typeof value === "string" && COMPANION_CHARACTER_IDS.includes(value as CompanionCharacterId);
}

export function isCompanionTriggerType(value: unknown): value is CompanionTriggerType {
  return typeof value === "string" && COMPANION_TRIGGER_TYPES.includes(value as CompanionTriggerType);
}

export function isCompanionResponsePreset(value: unknown): value is CompanionResponsePreset {
  return typeof value === "string" && COMPANION_RESPONSE_PRESETS.includes(value as CompanionResponsePreset);
}

function normalizeCharacterConfig(value: unknown, fallback: CompanionCharacterConfig): CompanionCharacterConfig {
  const input = value && typeof value === "object" ? (value as Partial<CompanionCharacterConfig>) : {};
  const responses = Object.fromEntries(
    COMPANION_TRIGGER_TYPES.map((trigger) => [
      trigger,
      isCompanionResponsePreset(input.responses?.[trigger]) ? input.responses[trigger] : fallback.responses[trigger]
    ])
  ) as Record<CompanionTriggerType, CompanionResponsePreset>;

  return {
    boredomMs:
      typeof input.boredomMs === "number" && Number.isFinite(input.boredomMs)
        ? Math.max(20_000, Math.min(15 * 60_000, Math.round(input.boredomMs)))
        : fallback.boredomMs,
    enabledByDefault: typeof input.enabledByDefault === "boolean" ? input.enabledByDefault : fallback.enabledByDefault,
    idleMaxMs:
      typeof input.idleMaxMs === "number" && Number.isFinite(input.idleMaxMs)
        ? Math.max(1_500, Math.min(20_000, Math.round(input.idleMaxMs)))
        : fallback.idleMaxMs,
    idleMinMs:
      typeof input.idleMinMs === "number" && Number.isFinite(input.idleMinMs)
        ? Math.max(600, Math.min(10_000, Math.round(input.idleMinMs)))
        : fallback.idleMinMs,
    reactionDurationMs:
      typeof input.reactionDurationMs === "number" && Number.isFinite(input.reactionDurationMs)
        ? Math.max(1_000, Math.min(20_000, Math.round(input.reactionDurationMs)))
        : fallback.reactionDurationMs,
    responses,
    scale:
      typeof input.scale === "number" && Number.isFinite(input.scale)
        ? Math.max(0.8, Math.min(3.2, Math.round(input.scale * 100) / 100))
        : fallback.scale
  };
}

export function normalizeCompanionSettings(value?: Partial<CompanionOverlaySettings>): CompanionOverlaySettings {
  const input = value && typeof value === "object" ? value : {};
  const characters = Object.fromEntries(
    COMPANION_CHARACTER_IDS.map((characterId) => [
      characterId,
      normalizeCharacterConfig(input.characters?.[characterId], DEFAULT_COMPANION_SETTINGS.characters[characterId])
    ])
  ) as Record<CompanionCharacterId, CompanionCharacterConfig>;

  return {
    characters,
    spriteCatalog: COMPANION_CATALOG.map((entry) => ({ ...entry })),
    stageHeight:
      typeof input.stageHeight === "number" && Number.isFinite(input.stageHeight)
        ? Math.max(360, Math.min(2160, Math.round(input.stageHeight)))
        : DEFAULT_COMPANION_SETTINGS.stageHeight,
    stageWidth:
      typeof input.stageWidth === "number" && Number.isFinite(input.stageWidth)
        ? Math.max(640, Math.min(3840, Math.round(input.stageWidth)))
        : DEFAULT_COMPANION_SETTINGS.stageWidth,
    streamOnlyMode: typeof input.streamOnlyMode === "boolean" ? input.streamOnlyMode : DEFAULT_COMPANION_SETTINGS.streamOnlyMode,
    version:
      typeof input.version === "number" && Number.isFinite(input.version)
        ? Math.max(1, Math.round(input.version))
        : DEFAULT_COMPANION_SETTINGS.version
  };
}

export function normalizeCompanionSession(value?: Partial<CompanionOverlaySession>): CompanionOverlaySession {
  const input = value && typeof value === "object" ? value : {};
  const enabledCharacterIds = Array.isArray(input.enabledCharacterIds)
    ? input.enabledCharacterIds.filter(isCompanionCharacterId)
    : DEFAULT_COMPANION_SESSION.enabledCharacterIds;

  return {
    activatedAt: typeof input.activatedAt === "string" ? input.activatedAt : undefined,
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_COMPANION_SESSION.enabled,
    enabledCharacterIds: enabledCharacterIds.length ? enabledCharacterIds : DEFAULT_COMPANION_SESSION.enabledCharacterIds,
    expiresAt: typeof input.expiresAt === "string" ? input.expiresAt : undefined,
    lastUpdatedAt: typeof input.lastUpdatedAt === "string" ? input.lastUpdatedAt : undefined,
    streamOnlyMode: typeof input.streamOnlyMode === "boolean" ? input.streamOnlyMode : DEFAULT_COMPANION_SESSION.streamOnlyMode
  };
}

export function createCompanionTriggerEvent(
  trigger: CompanionTriggerType,
  source: CompanionTriggerEvent["source"],
  note?: string
): CompanionTriggerEvent {
  return {
    at: new Date().toISOString(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    note,
    source,
    trigger
  };
}

export function isCompanionSessionActive(session: CompanionOverlaySession) {
  if (!session.enabled) {
    return false;
  }

  if (!session.expiresAt) {
    return true;
  }

  return Date.parse(session.expiresAt) > Date.now();
}
