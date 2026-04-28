import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CompanionOverlaySettings } from "@/lib/venus-companions";
import { normalizeCompanionSettings } from "@/lib/venus-companions";
import type { OverlayStylesSettings } from "@/lib/venus-overlay-theme";
import { normalizeOverlayStyles } from "@/lib/venus-overlay-theme";
import { getVideoAssetRoot } from "@/lib/video-assets";

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

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
  defaultResourceId?: string;
  lastOpenedAt?: string;
  lastUsedResourceId?: string;
  thumbnailMode?: "auto" | "custom-url" | "resource";
  thumbnailResourceId?: string;
  thumbnailUrl?: string;
  thumbnailSuggestion?: {
    fetchedAt?: string;
    imageUrl?: string;
    label?: string;
    provider?: string;
    queryFingerprint?: string;
    sourceUrl?: string;
  };
  thumbnailSuggestionDismissedFingerprint?: string;
  thumbnailLookupAttemptedAt?: string;
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
  sortOrder?: number;
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

export interface VenusSyncPreferences {
  alias?: string;
  anniversaryIntroSeen?: boolean;
  artworkAutomation?: {
    autoFetchMissingArtwork?: boolean;
  };
  backgroundImage?: string;
  backgroundImageFit?: "contain" | "cover" | "tile";
  backgroundMode?: "image" | "nebula" | "space";
  breakMusic?: {
    autoStartOnPause?: boolean;
    defaultVolume?: number;
    enabled?: boolean;
    playlistSongIds?: string[];
    triggerHotkey?: string;
  };
  buttonTheme?: "cyan" | "pink" | "purple";
  companions?: CompanionOverlaySettings;
  defaultView?: "detail" | "home" | "library" | "preferences" | "setlists" | "tools";
  desktopPerformance?: {
    disableAnniversaryIntro?: boolean;
    disableFixedBackgroundAttachment?: boolean;
    disableLaunchAutoSync?: boolean;
    lazyTikTokStatusProbe?: boolean;
    reducedAmbientEffects?: boolean;
    reducedGlassEffects?: boolean;
  };
  desktopPerformanceConfigured?: boolean;
  desktopPerformanceMode?: "standard" | "stream-safe";
  heroImage?: string;
  locale?: "en" | "ru";
  overlayStyles?: OverlayStylesSettings;
  navigationHotkeys?: {
    back?: string;
  };
  playbackHotkeys?: {
    nextSong?: string;
    previousSong?: string;
    seekBackward10?: string;
    seekForward10?: string;
  };
  profileImage?: string;
  reuseCompanionWindow?: boolean;
  syncSiteUrl?: string;
  textTone?: "bright" | "lilac" | "soft";
  themePreset?: "orbital-blue" | "pink-purple" | "space-gift";
  tiktokEffects?: Array<{
    desktopTrigger?: string;
    emoji?: string;
    enabled?: boolean;
    id?: string;
    label?: string;
    studioSlot?: number;
  }>;
  tiktokEffectsEnabled?: boolean;
  typography?: {
    boldText?: boolean;
    fontFamily?: "serif" | "system-sans" | "venus-display";
    fontScale?: number;
  };
  visualDefaultsVersion?: number;
  volumeBehavior?: {
    globalYouTubeVolume?: number;
    rememberVolumePerSong?: boolean;
    songVolumeMemory?: Record<string, number>;
  };
}

export interface VenusSyncTools {
  goals?: Array<{
    completed?: boolean;
    createdAt?: string;
    id?: string;
    text?: string;
    updatedAt?: string;
  }>;
  lastPrediction?: string;
  lastPredictionAt?: string;
  liveOverlay?: VenusSyncLiveOverlay;
  noteText?: string;
  notesUpdatedAt?: string;
  timerDurationSeconds?: number;
  timerSound?: "bell" | "chime" | "crystal" | "pulse";
}

export interface VenusSyncDocument {
  fullBackup?: VenusSyncFullBackup;
  liveOverlay: VenusSyncLiveOverlay;
  preferences?: VenusSyncPreferences;
  resources: VenusSyncResource[];
  revision: number;
  setlists: VenusSyncSetlist[];
  songs: VenusSyncSong[];
  tools?: VenusSyncTools;
  updatedAt: string;
}

export interface VenusSyncFullBackup {
  appName: "VENUS";
  backupSchemaVersion: number;
  exportedAt: string;
  formatVersion: number;
  kind: "venus-full-backup";
  restoreHints?: JsonValue;
  snapshot: Record<string, JsonValue>;
  sourceAppVersion: string;
  sourceExportedAt: string;
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
const VALID_BACKGROUND_IMAGE_FITS = new Set(["contain", "cover", "tile"]);
const VALID_BACKGROUND_MODES = new Set(["image", "nebula", "space"]);
const VALID_BUTTON_THEMES = new Set(["cyan", "pink", "purple"]);
const VALID_DEFAULT_VIEWS = new Set(["detail", "home", "library", "preferences", "setlists", "tools"]);
const VALID_DESKTOP_PERFORMANCE_MODES = new Set(["standard", "stream-safe"]);
const VALID_LOCALES = new Set(["en", "ru"]);
const VALID_TEXT_TONES = new Set(["bright", "lilac", "soft"]);
const VALID_THEME_PRESETS = new Set(["orbital-blue", "pink-purple", "space-gift"]);
const VALID_TYPOGRAPHY_FAMILIES = new Set(["serif", "system-sans", "venus-display"]);
const VALID_TIMER_SOUNDS = new Set(["bell", "chime", "crystal", "pulse"]);

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

function sanitizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizePercent(value: unknown, fallback = 0) {
  return Math.max(0, Math.min(100, Math.round(sanitizeNumber(value, fallback))));
}

function sanitizeJsonValue(value: unknown): JsonValue | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeJsonValue(entry))
      .filter((entry): entry is JsonValue => typeof entry !== "undefined");
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, entryValue]) => {
      const sanitizedEntry = sanitizeJsonValue(entryValue);
      return typeof sanitizedEntry === "undefined" ? [] : [[key, sanitizedEntry]];
    })
  );
}

function sanitizeStringNumberMap(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, entryValue]) =>
      typeof key === "string" && typeof entryValue === "number" && Number.isFinite(entryValue)
        ? [[key, sanitizePercent(entryValue, 50)]]
        : []
    )
  );
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

  const rawSuggestion =
    song.thumbnailSuggestion && typeof song.thumbnailSuggestion === "object"
      ? (song.thumbnailSuggestion as Record<string, unknown>)
      : null;
  const thumbnailSuggestion =
    rawSuggestion &&
    sanitizeString(rawSuggestion.imageUrl) &&
    sanitizeString(rawSuggestion.provider) &&
    sanitizeString(rawSuggestion.queryFingerprint)
      ? {
          fetchedAt: sanitizeString(rawSuggestion.fetchedAt) || undefined,
          imageUrl: sanitizeString(rawSuggestion.imageUrl),
          label: sanitizeString(rawSuggestion.label) || undefined,
          provider: sanitizeString(rawSuggestion.provider),
          queryFingerprint: sanitizeString(rawSuggestion.queryFingerprint),
          sourceUrl: sanitizeString(rawSuggestion.sourceUrl) || undefined
        }
      : undefined;

  return {
    aliases: sanitizeStringList(song.aliases),
    artist: sanitizeString(song.artist),
    categories: sanitizeStringList(song.categories),
    createdAt: sanitizeString(song.createdAt),
    defaultResourceId: sanitizeString(song.defaultResourceId) || undefined,
    favorite: Boolean(song.favorite),
    id,
    lastOpenedAt: sanitizeString(song.lastOpenedAt) || undefined,
    lastUsedResourceId: sanitizeString(song.lastUsedResourceId) || undefined,
    notes: sanitizeString(song.notes),
    performanceHistory: Array.isArray(song.performanceHistory) ? song.performanceHistory : [],
    thumbnailMode: VALID_THUMBNAIL_MODES.has(sanitizeString(song.thumbnailMode))
      ? (sanitizeString(song.thumbnailMode) as VenusSyncSong["thumbnailMode"])
      : "auto",
    thumbnailLookupAttemptedAt: sanitizeString(song.thumbnailLookupAttemptedAt) || undefined,
    thumbnailResourceId: sanitizeString(song.thumbnailResourceId) || undefined,
    thumbnailSuggestion,
    thumbnailSuggestionDismissedFingerprint: sanitizeString(song.thumbnailSuggestionDismissedFingerprint) || undefined,
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
    sortOrder: sanitizeNumber(resource.sortOrder, 0),
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

function sanitizePreferences(value: unknown): VenusSyncPreferences | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const preferences = value as Record<string, unknown>;
  const rawDesktopPerformance =
    preferences.desktopPerformance && typeof preferences.desktopPerformance === "object"
      ? (preferences.desktopPerformance as Record<string, unknown>)
      : null;
  const rawNavigationHotkeys =
    preferences.navigationHotkeys && typeof preferences.navigationHotkeys === "object"
      ? (preferences.navigationHotkeys as Record<string, unknown>)
      : null;
  const rawPlaybackHotkeys =
    preferences.playbackHotkeys && typeof preferences.playbackHotkeys === "object"
      ? (preferences.playbackHotkeys as Record<string, unknown>)
      : null;
  const rawBreakMusic =
    preferences.breakMusic && typeof preferences.breakMusic === "object"
      ? (preferences.breakMusic as Record<string, unknown>)
      : null;
  const rawTypography =
    preferences.typography && typeof preferences.typography === "object"
      ? (preferences.typography as Record<string, unknown>)
      : null;
  const rawOverlayStyles =
    preferences.overlayStyles && typeof preferences.overlayStyles === "object"
      ? (preferences.overlayStyles as OverlayStylesSettings)
      : null;
  const rawCompanions =
    preferences.companions && typeof preferences.companions === "object"
      ? (preferences.companions as CompanionOverlaySettings)
      : null;
  const rawVolumeBehavior =
    preferences.volumeBehavior && typeof preferences.volumeBehavior === "object"
      ? (preferences.volumeBehavior as Record<string, unknown>)
      : null;
  const rawArtworkAutomation =
    preferences.artworkAutomation && typeof preferences.artworkAutomation === "object"
      ? (preferences.artworkAutomation as Record<string, unknown>)
      : null;

  return {
    alias: sanitizeString(preferences.alias),
    anniversaryIntroSeen: sanitizeBoolean(preferences.anniversaryIntroSeen),
    artworkAutomation: {
      autoFetchMissingArtwork: sanitizeBoolean(rawArtworkAutomation?.autoFetchMissingArtwork, true)
    },
    backgroundImage: sanitizeString(preferences.backgroundImage),
    backgroundImageFit: VALID_BACKGROUND_IMAGE_FITS.has(sanitizeString(preferences.backgroundImageFit))
      ? (sanitizeString(preferences.backgroundImageFit) as VenusSyncPreferences["backgroundImageFit"])
      : "cover",
    backgroundMode: VALID_BACKGROUND_MODES.has(sanitizeString(preferences.backgroundMode))
      ? (sanitizeString(preferences.backgroundMode) as VenusSyncPreferences["backgroundMode"])
      : "space",
    breakMusic: {
      autoStartOnPause: sanitizeBoolean(rawBreakMusic?.autoStartOnPause),
      defaultVolume: sanitizePercent(rawBreakMusic?.defaultVolume, 12),
      enabled: sanitizeBoolean(rawBreakMusic?.enabled),
      playlistSongIds: sanitizeStringList(rawBreakMusic?.playlistSongIds),
      triggerHotkey: sanitizeString(rawBreakMusic?.triggerHotkey)
    },
    buttonTheme: VALID_BUTTON_THEMES.has(sanitizeString(preferences.buttonTheme))
      ? (sanitizeString(preferences.buttonTheme) as VenusSyncPreferences["buttonTheme"])
      : "pink",
    companions: normalizeCompanionSettings(rawCompanions ?? undefined),
    defaultView: VALID_DEFAULT_VIEWS.has(sanitizeString(preferences.defaultView))
      ? (sanitizeString(preferences.defaultView) as VenusSyncPreferences["defaultView"])
      : "home",
    desktopPerformance: {
      disableAnniversaryIntro: sanitizeBoolean(rawDesktopPerformance?.disableAnniversaryIntro),
      disableFixedBackgroundAttachment: sanitizeBoolean(rawDesktopPerformance?.disableFixedBackgroundAttachment),
      disableLaunchAutoSync: sanitizeBoolean(rawDesktopPerformance?.disableLaunchAutoSync),
      lazyTikTokStatusProbe: sanitizeBoolean(rawDesktopPerformance?.lazyTikTokStatusProbe),
      reducedAmbientEffects: sanitizeBoolean(rawDesktopPerformance?.reducedAmbientEffects),
      reducedGlassEffects: sanitizeBoolean(rawDesktopPerformance?.reducedGlassEffects)
    },
    desktopPerformanceConfigured: sanitizeBoolean(preferences.desktopPerformanceConfigured),
    desktopPerformanceMode: VALID_DESKTOP_PERFORMANCE_MODES.has(sanitizeString(preferences.desktopPerformanceMode))
      ? (sanitizeString(preferences.desktopPerformanceMode) as VenusSyncPreferences["desktopPerformanceMode"])
      : "standard",
    heroImage: sanitizeString(preferences.heroImage),
    locale: VALID_LOCALES.has(sanitizeString(preferences.locale))
      ? (sanitizeString(preferences.locale) as VenusSyncPreferences["locale"])
      : "en",
    overlayStyles: normalizeOverlayStyles(rawOverlayStyles ?? undefined),
    navigationHotkeys: {
      back: sanitizeString(rawNavigationHotkeys?.back)
    },
    playbackHotkeys: {
      nextSong: sanitizeString(rawPlaybackHotkeys?.nextSong),
      previousSong: sanitizeString(rawPlaybackHotkeys?.previousSong),
      seekBackward10: sanitizeString(rawPlaybackHotkeys?.seekBackward10),
      seekForward10: sanitizeString(rawPlaybackHotkeys?.seekForward10)
    },
    profileImage: sanitizeString(preferences.profileImage),
    reuseCompanionWindow: sanitizeBoolean(preferences.reuseCompanionWindow),
    syncSiteUrl: sanitizeString(preferences.syncSiteUrl),
    textTone: VALID_TEXT_TONES.has(sanitizeString(preferences.textTone))
      ? (sanitizeString(preferences.textTone) as VenusSyncPreferences["textTone"])
      : "bright",
    themePreset: VALID_THEME_PRESETS.has(sanitizeString(preferences.themePreset))
      ? (sanitizeString(preferences.themePreset) as VenusSyncPreferences["themePreset"])
      : "orbital-blue",
    tiktokEffects: Array.isArray(preferences.tiktokEffects)
      ? preferences.tiktokEffects
          .filter((effect): effect is Record<string, unknown> => Boolean(effect && typeof effect === "object"))
          .map((effect) => ({
            desktopTrigger: sanitizeString(effect.desktopTrigger) || undefined,
            emoji: sanitizeString(effect.emoji) || undefined,
            enabled: sanitizeBoolean(effect.enabled),
            id: sanitizeString(effect.id) || undefined,
            label: sanitizeString(effect.label) || undefined,
            studioSlot: Math.max(1, Math.min(9, Math.round(sanitizeNumber(effect.studioSlot, 1))))
          }))
      : [],
    tiktokEffectsEnabled: sanitizeBoolean(preferences.tiktokEffectsEnabled),
    typography: {
      boldText: sanitizeBoolean(rawTypography?.boldText),
      fontFamily: VALID_TYPOGRAPHY_FAMILIES.has(sanitizeString(rawTypography?.fontFamily))
        ? (sanitizeString(rawTypography?.fontFamily) as "serif" | "system-sans" | "venus-display")
        : "venus-display",
      fontScale: sanitizeNumber(rawTypography?.fontScale, 1)
    },
    visualDefaultsVersion: Math.max(0, Math.round(sanitizeNumber(preferences.visualDefaultsVersion, 0))),
    volumeBehavior: {
      globalYouTubeVolume: sanitizePercent(rawVolumeBehavior?.globalYouTubeVolume, 50),
      rememberVolumePerSong: sanitizeBoolean(rawVolumeBehavior?.rememberVolumePerSong),
      songVolumeMemory: sanitizeStringNumberMap(rawVolumeBehavior?.songVolumeMemory)
    }
  };
}

function sanitizeTools(value: unknown): VenusSyncTools | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const tools = value as Record<string, unknown>;

  return {
    goals: Array.isArray(tools.goals)
      ? tools.goals
          .filter((goal): goal is Record<string, unknown> => Boolean(goal && typeof goal === "object"))
          .map((goal) => ({
            completed: sanitizeBoolean(goal.completed),
            createdAt: sanitizeString(goal.createdAt) || undefined,
            id: sanitizeString(goal.id) || undefined,
            text: sanitizeString(goal.text) || undefined,
            updatedAt: sanitizeString(goal.updatedAt) || undefined
          }))
      : [],
    lastPrediction: sanitizeString(tools.lastPrediction) || undefined,
    lastPredictionAt: sanitizeString(tools.lastPredictionAt) || undefined,
    liveOverlay: sanitizeLiveOverlay(tools.liveOverlay),
    noteText: sanitizeString(tools.noteText),
    notesUpdatedAt: sanitizeString(tools.notesUpdatedAt) || undefined,
    timerDurationSeconds: Math.max(1, Math.round(sanitizeNumber(tools.timerDurationSeconds, 300))),
    timerSound: VALID_TIMER_SOUNDS.has(sanitizeString(tools.timerSound))
      ? (sanitizeString(tools.timerSound) as VenusSyncTools["timerSound"])
      : "bell"
  };
}

function sanitizeFullBackup(value: unknown): VenusSyncFullBackup | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const backup = value as Record<string, unknown>;
  const sanitizedSnapshot = sanitizeJsonValue(backup.snapshot);
  if (!sanitizedSnapshot || typeof sanitizedSnapshot !== "object" || Array.isArray(sanitizedSnapshot)) {
    return undefined;
  }

  const snapshot = sanitizedSnapshot as Record<string, JsonValue>;
  if (!Array.isArray(snapshot.songs) || !Array.isArray(snapshot.resources) || !Array.isArray(snapshot.setlists)) {
    return undefined;
  }

  const restoreHints = sanitizeJsonValue(backup.restoreHints);

  return {
    appName: "VENUS",
    backupSchemaVersion:
      typeof backup.backupSchemaVersion === "number" && Number.isFinite(backup.backupSchemaVersion)
        ? Math.max(1, Math.round(backup.backupSchemaVersion))
        : typeof backup.formatVersion === "number" && Number.isFinite(backup.formatVersion)
          ? Math.max(1, Math.round(backup.formatVersion))
          : 1,
    exportedAt: sanitizeString(backup.exportedAt) || sanitizeString(backup.sourceExportedAt) || new Date().toISOString(),
    formatVersion:
      typeof backup.formatVersion === "number" && Number.isFinite(backup.formatVersion)
        ? Math.max(1, Math.round(backup.formatVersion))
        : typeof backup.backupSchemaVersion === "number" && Number.isFinite(backup.backupSchemaVersion)
          ? Math.max(1, Math.round(backup.backupSchemaVersion))
          : 1,
    kind: "venus-full-backup",
    restoreHints: restoreHints && typeof restoreHints === "object" ? restoreHints : undefined,
    snapshot,
    sourceAppVersion: sanitizeString(backup.sourceAppVersion) || "legacy-venus",
    sourceExportedAt: sanitizeString(backup.sourceExportedAt) || sanitizeString(backup.exportedAt) || new Date().toISOString()
  };
}

export function sanitizeVenusSyncDocument(input: unknown, nextRevision: number): VenusSyncDocument {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const updatedAt = sanitizeString(raw.updatedAt) || new Date().toISOString();
  const fullBackup = sanitizeFullBackup(raw.fullBackup);
  const fullBackupSnapshot =
    fullBackup?.snapshot && typeof fullBackup.snapshot === "object" && !Array.isArray(fullBackup.snapshot)
      ? (fullBackup.snapshot as Record<string, unknown>)
      : null;
  const fullBackupTools =
    fullBackupSnapshot?.tools && typeof fullBackupSnapshot.tools === "object" && !Array.isArray(fullBackupSnapshot.tools)
      ? (fullBackupSnapshot.tools as Record<string, unknown>)
      : null;
  const preferences = sanitizePreferences(fullBackupSnapshot?.preferences ?? raw.preferences);
  const tools = sanitizeTools(fullBackupTools ?? raw.tools);
  const liveOverlay = sanitizeLiveOverlay(fullBackupTools?.liveOverlay ?? raw.liveOverlay ?? tools?.liveOverlay);
  const songsSource = Array.isArray(fullBackupSnapshot?.songs) ? fullBackupSnapshot.songs : Array.isArray(raw.songs) ? raw.songs : [];
  const songs = songsSource.map(sanitizeSong).filter((song): song is VenusSyncSong => Boolean(song));
  const songIds = new Set(songs.map((song) => song.id));
  const resourcesSource = Array.isArray(fullBackupSnapshot?.resources)
    ? fullBackupSnapshot.resources
    : Array.isArray(raw.resources)
      ? raw.resources
      : [];
  const resources = resourcesSource
        .map(sanitizeResource)
        .filter((resource): resource is VenusSyncResource => Boolean(resource && songIds.has(resource.songId)));
  const setlistsSource = Array.isArray(fullBackupSnapshot?.setlists)
    ? fullBackupSnapshot.setlists
    : Array.isArray(raw.setlists)
      ? raw.setlists
      : [];
  const setlists = setlistsSource.map(sanitizeSetlist).filter((setlist): setlist is VenusSyncSetlist => Boolean(setlist));

  return {
    fullBackup,
    liveOverlay,
    preferences,
    resources,
    revision: nextRevision,
    setlists,
    songs,
    tools: tools ? { ...tools, liveOverlay } : { liveOverlay },
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
