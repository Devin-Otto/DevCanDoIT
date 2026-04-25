import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { getVideoAssetRoot } from "@/lib/video-assets";

export interface VenusSyncSong {
  id: string;
  title?: string;
  artist?: string;
  aliases?: string[];
  categories?: string[];
  tags?: string[];
  tagDecorations?: Record<string, unknown>;
  notes?: string;
  favorite?: boolean;
  lastOpenedAt?: string;
  lastUsedResourceId?: string;
  thumbnailMode?: "auto" | "custom-url" | "resource";
  thumbnailResourceId?: string;
  thumbnailUrl?: string;
  performanceHistory?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VenusSyncResource {
  availability?: "available" | "metadata-only";
  chordImportError?: string;
  chordSheet?: unknown;
  createdAt?: string;
  embeddable?: boolean;
  id: string;
  kind?: string;
  label?: string;
  localSource?: {
    downloadFamily?: "local" | "xminus" | "youtube";
    downloadedAt?: string;
    fileName?: string;
    fileSizeBytes?: number;
    formatId?: string;
    formatLabel?: string;
    mimeType?: string;
    sourceFingerprint?: string;
    sourceUrl?: string;
  };
  provider?: string;
  songId: string;
  transposeNote?: string;
  updatedAt?: string;
  url?: string;
}

export interface VenusSyncSetlist {
  accentColor?: "default" | "red" | "yellow";
  autoplayEnabled?: boolean;
  createdAt?: string;
  description?: string;
  id: string;
  name?: string;
  pinned?: boolean;
  songIds?: string[];
  updatedAt?: string;
}

export interface VenusSyncLiveOverlayMetric {
  current: number;
  target: number;
}

export interface VenusSyncLiveOverlay {
  accentColor?: "cyan" | "pink" | "purple";
  coins: VenusSyncLiveOverlayMetric;
  dailyHearts: VenusSyncLiveOverlayMetric;
  followers: VenusSyncLiveOverlayMetric;
  goalCurrent: number;
  goalLabel: string;
  goalTarget: number;
  likes: VenusSyncLiveOverlayMetric;
  updatedAt?: string;
}

export interface VenusSyncDocument {
  liveOverlay: VenusSyncLiveOverlay;
  resources: VenusSyncResource[];
  revision: number;
  setlists: VenusSyncSetlist[];
  songs: VenusSyncSong[];
  updatedAt: string;
}

const DEFAULT_LIVE_OVERLAY: VenusSyncLiveOverlay = {
  accentColor: "pink",
  coins: { current: 0, target: 1000 },
  dailyHearts: { current: 0, target: 10000 },
  followers: { current: 0, target: 100 },
  goalCurrent: 0,
  goalLabel: "Support Goal",
  goalTarget: 1000,
  likes: { current: 0, target: 5000 },
  updatedAt: new Date(0).toISOString()
};

const EMPTY_DOCUMENT: VenusSyncDocument = {
  liveOverlay: DEFAULT_LIVE_OVERLAY,
  resources: [],
  revision: 0,
  setlists: [],
  songs: [],
  updatedAt: new Date(0).toISOString()
};

const VALID_SETLIST_ACCENTS = new Set(["default", "red", "yellow"]);
const VALID_THUMBNAIL_MODES = new Set(["auto", "custom-url", "resource"]);
const VALID_OVERLAY_ACCENTS = new Set(["cyan", "pink", "purple"]);

function resolveAssetRoot(root: string) {
  return path.isAbsolute(root) ? root : path.join(process.cwd(), root);
}

export function getVenusSyncDataRoot() {
  const configuredRoot = process.env.VENUS_DATA_ROOT?.trim();
  if (configuredRoot) {
    return resolveAssetRoot(configuredRoot);
  }

  return path.join(resolveAssetRoot(getVideoAssetRoot()), "venus-sync");
}

function getSyncFilePath() {
  return path.join(getVenusSyncDataRoot(), "venus-sync-state.json");
}

function sanitizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function sanitizeStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function sanitizeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeLiveOverlayMetric(value: unknown, fallback: VenusSyncLiveOverlayMetric): VenusSyncLiveOverlayMetric {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const metric = value as Record<string, unknown>;

  return {
    current: Math.max(0, sanitizeNumber(metric.current, fallback.current)),
    target: Math.max(1, sanitizeNumber(metric.target, fallback.target))
  };
}

function sanitizeLiveOverlay(value: unknown): VenusSyncLiveOverlay {
  if (!value || typeof value !== "object") {
    return DEFAULT_LIVE_OVERLAY;
  }

  const overlay = value as Record<string, unknown>;
  const accentColor = sanitizeString(overlay.accentColor, DEFAULT_LIVE_OVERLAY.accentColor);

  return {
    accentColor: VALID_OVERLAY_ACCENTS.has(accentColor) ? (accentColor as VenusSyncLiveOverlay["accentColor"]) : DEFAULT_LIVE_OVERLAY.accentColor,
    coins: sanitizeLiveOverlayMetric(overlay.coins, DEFAULT_LIVE_OVERLAY.coins),
    dailyHearts: sanitizeLiveOverlayMetric(overlay.dailyHearts, DEFAULT_LIVE_OVERLAY.dailyHearts),
    followers: sanitizeLiveOverlayMetric(overlay.followers, DEFAULT_LIVE_OVERLAY.followers),
    goalCurrent: Math.max(0, sanitizeNumber(overlay.goalCurrent, DEFAULT_LIVE_OVERLAY.goalCurrent)),
    goalLabel: sanitizeString(overlay.goalLabel, DEFAULT_LIVE_OVERLAY.goalLabel),
    goalTarget: Math.max(1, sanitizeNumber(overlay.goalTarget, DEFAULT_LIVE_OVERLAY.goalTarget)),
    likes: sanitizeLiveOverlayMetric(overlay.likes, DEFAULT_LIVE_OVERLAY.likes),
    updatedAt: sanitizeString(overlay.updatedAt) || undefined
  };
}

function sanitizeSong(value: unknown): VenusSyncSong | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const song = value as Record<string, unknown>;
  const id = sanitizeString(song.id).trim();
  if (!id) {
    return null;
  }

  return {
    aliases: sanitizeStringList(song.aliases),
    artist: sanitizeString(song.artist),
    categories: sanitizeStringList(song.categories),
    createdAt: sanitizeString(song.createdAt),
    favorite: Boolean(song.favorite),
    id,
    lastOpenedAt: sanitizeString(song.lastOpenedAt) || undefined,
    lastUsedResourceId: sanitizeString(song.lastUsedResourceId) || undefined,
    notes: sanitizeString(song.notes),
    performanceHistory: Array.isArray(song.performanceHistory) ? song.performanceHistory : [],
    thumbnailMode: VALID_THUMBNAIL_MODES.has(sanitizeString(song.thumbnailMode))
      ? (sanitizeString(song.thumbnailMode) as VenusSyncSong["thumbnailMode"])
      : "auto",
    thumbnailResourceId: sanitizeString(song.thumbnailResourceId) || undefined,
    thumbnailUrl: sanitizeString(song.thumbnailUrl) || undefined,
    tagDecorations: song.tagDecorations && typeof song.tagDecorations === "object" ? (song.tagDecorations as Record<string, unknown>) : {},
    tags: sanitizeStringList(song.tags),
    title: sanitizeString(song.title),
    updatedAt: sanitizeString(song.updatedAt)
  };
}

function sanitizeResource(value: unknown): VenusSyncResource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const resource = value as Record<string, unknown>;
  const id = sanitizeString(resource.id).trim();
  const songId = sanitizeString(resource.songId).trim();
  if (!id || !songId) {
    return null;
  }

  const rawLocalSource =
    resource.localSource && typeof resource.localSource === "object"
      ? (resource.localSource as Record<string, unknown>)
      : null;
  const localSource: VenusSyncResource["localSource"] =
    rawLocalSource &&
    (sanitizeString(rawLocalSource.fileName) ||
      sanitizeString(rawLocalSource.sourceFingerprint) ||
      sanitizeString(rawLocalSource.sourceUrl))
      ? {
          downloadFamily:
            rawLocalSource.downloadFamily === "local"
              ? "local"
              : rawLocalSource.downloadFamily === "xminus"
                ? "xminus"
                : rawLocalSource.downloadFamily === "youtube"
                  ? "youtube"
                  : undefined,
          downloadedAt: sanitizeString(rawLocalSource.downloadedAt) || undefined,
          fileName: sanitizeString(rawLocalSource.fileName) || undefined,
          fileSizeBytes:
            typeof rawLocalSource.fileSizeBytes === "number" && Number.isFinite(rawLocalSource.fileSizeBytes)
              ? rawLocalSource.fileSizeBytes
              : undefined,
          formatId: sanitizeString(rawLocalSource.formatId) || undefined,
          formatLabel: sanitizeString(rawLocalSource.formatLabel) || undefined,
          mimeType: sanitizeString(rawLocalSource.mimeType) || undefined,
          sourceFingerprint: sanitizeString(rawLocalSource.sourceFingerprint) || undefined,
          sourceUrl: sanitizeString(rawLocalSource.sourceUrl) || undefined
        }
      : undefined;

  return {
    availability: resource.availability === "available" ? "available" : "metadata-only",
    chordImportError: sanitizeString(resource.chordImportError) || undefined,
    chordSheet: resource.chordSheet,
    createdAt: sanitizeString(resource.createdAt),
    embeddable: Boolean(resource.embeddable),
    id,
    kind: sanitizeString(resource.kind, "reference"),
    label: sanitizeString(resource.label),
    localSource,
    provider: sanitizeString(resource.provider, "Reference"),
    songId,
    transposeNote: sanitizeString(resource.transposeNote) || undefined,
    updatedAt: sanitizeString(resource.updatedAt),
    url: sanitizeString(resource.url)
  };
}

function sanitizeSetlist(value: unknown): VenusSyncSetlist | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const setlist = value as Record<string, unknown>;
  const id = sanitizeString(setlist.id).trim();
  if (!id) {
    return null;
  }

  return {
    accentColor: VALID_SETLIST_ACCENTS.has(sanitizeString(setlist.accentColor))
      ? (sanitizeString(setlist.accentColor) as VenusSyncSetlist["accentColor"])
      : "default",
    autoplayEnabled: Boolean(setlist.autoplayEnabled),
    createdAt: sanitizeString(setlist.createdAt),
    description: sanitizeString(setlist.description),
    id,
    name: sanitizeString(setlist.name, "Untitled Setlist"),
    pinned: Boolean(setlist.pinned),
    songIds: sanitizeStringList(setlist.songIds),
    updatedAt: sanitizeString(setlist.updatedAt)
  };
}

export function sanitizeVenusSyncDocument(input: unknown, nextRevision: number): VenusSyncDocument {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const updatedAt = sanitizeString(raw.updatedAt) || new Date().toISOString();
  const liveOverlay = sanitizeLiveOverlay(raw.liveOverlay);
  const songs = Array.isArray(raw.songs) ? raw.songs.map(sanitizeSong).filter((song): song is VenusSyncSong => Boolean(song)) : [];
  const songIds = new Set(songs.map((song) => song.id));
  const resources = Array.isArray(raw.resources)
    ? raw.resources
        .map(sanitizeResource)
        .filter((resource): resource is VenusSyncResource => Boolean(resource && songIds.has(resource.songId)))
    : [];
  const setlists = Array.isArray(raw.setlists)
    ? raw.setlists.map(sanitizeSetlist).filter((setlist): setlist is VenusSyncSetlist => Boolean(setlist))
    : [];

  return {
    liveOverlay,
    resources,
    revision: nextRevision,
    setlists,
    songs,
    updatedAt
  };
}

export async function loadVenusSyncDocument(): Promise<VenusSyncDocument> {
  try {
    const text = await readFile(getSyncFilePath(), "utf8");
    const parsed = JSON.parse(text) as unknown;
    const revision = parsed && typeof parsed === "object" && typeof (parsed as { revision?: unknown }).revision === "number"
      ? (parsed as { revision: number }).revision
      : 0;
    return sanitizeVenusSyncDocument(parsed, revision);
  } catch {
    return EMPTY_DOCUMENT;
  }
}

export async function saveVenusSyncDocument(input: unknown, nextRevision: number) {
  const document = sanitizeVenusSyncDocument(
    {
      ...(input && typeof input === "object" ? input : {}),
      updatedAt: new Date().toISOString()
    },
    nextRevision
  );
  const dataRoot = getVenusSyncDataRoot();
  const filePath = getSyncFilePath();
  const temporaryPath = `${filePath}.${Date.now()}.tmp`;

  await mkdir(dataRoot, { recursive: true });
  await writeFile(temporaryPath, JSON.stringify(document, null, 2));
  await rename(temporaryPath, filePath);

  return document;
}
