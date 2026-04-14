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
  provider?: string;
  songId: string;
  transposeNote?: string;
  updatedAt?: string;
  url?: string;
}

export interface VenusSyncSetlist {
  createdAt?: string;
  description?: string;
  id: string;
  name?: string;
  pinned?: boolean;
  songIds?: string[];
  updatedAt?: string;
}

export interface VenusSyncDocument {
  resources: VenusSyncResource[];
  revision: number;
  setlists: VenusSyncSetlist[];
  songs: VenusSyncSong[];
  updatedAt: string;
}

const EMPTY_DOCUMENT: VenusSyncDocument = {
  resources: [],
  revision: 0,
  setlists: [],
  songs: [],
  updatedAt: new Date(0).toISOString()
};

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

  return {
    availability: resource.availability === "available" ? "available" : "metadata-only",
    chordImportError: sanitizeString(resource.chordImportError) || undefined,
    chordSheet: resource.chordSheet,
    createdAt: sanitizeString(resource.createdAt),
    embeddable: Boolean(resource.embeddable),
    id,
    kind: sanitizeString(resource.kind, "reference"),
    label: sanitizeString(resource.label),
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
