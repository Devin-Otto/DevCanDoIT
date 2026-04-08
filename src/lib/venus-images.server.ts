import path from "path";
import { existsSync, rmSync, statSync } from "fs";

import { getVideoAssetRoot } from "@/lib/video-assets";

const ALLOWED_EXTENSIONS = new Set([".jpeg", ".jpg", ".png", ".webp", ".avif"]);

const VENUS_IMAGE_SLOTS = {
  background: {
    basename: "venus-background",
    label: "Background image",
    placeholderAccent: "#90c8ff",
    placeholderHeight: 900,
    placeholderWidth: 1600
  },
  center: {
    basename: "venus-center",
    label: "Center image",
    placeholderAccent: "#cf8fff",
    placeholderHeight: 1024,
    placeholderWidth: 1024
  },
  profile: {
    basename: "venus-profile",
    label: "Profile image",
    placeholderAccent: "#7bc4ff",
    placeholderHeight: 512,
    placeholderWidth: 512
  }
} as const;

export type VenusImageSlot = keyof typeof VENUS_IMAGE_SLOTS;

type VenusImageSource = "placeholder" | "volume";

export interface ResolvedVenusImage {
  exists: boolean;
  fileName: string;
  filePath: string | null;
  sizeBytes: number | null;
  slot: VenusImageSlot;
  source: VenusImageSource;
  svgFallback?: string;
  updatedAt: string | null;
}

export function isVenusImageSlot(value: string): value is VenusImageSlot {
  return value in VENUS_IMAGE_SLOTS;
}

export function getVenusImageAssetRoot() {
  return process.env.VENUS_IMAGE_ASSET_ROOT?.trim() || getVideoAssetRoot();
}

function getSlotConfig(slot: VenusImageSlot) {
  return VENUS_IMAGE_SLOTS[slot];
}

function buildVenusImagePath(slot: VenusImageSlot, extension: string) {
  return path.join(getVenusImageAssetRoot(), `${getSlotConfig(slot).basename}${extension}`);
}

export function getVenusImageCandidates(slot: VenusImageSlot) {
  return [".jpeg", ".jpg", ".png", ".webp", ".avif"].map((extension) => ({
    extension,
    fileName: `${getSlotConfig(slot).basename}${extension}`,
    filePath: buildVenusImagePath(slot, extension)
  }));
}

function escapeSvgText(value: string) {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

function buildVenusPlaceholderSvg(slot: VenusImageSlot) {
  const config = getSlotConfig(slot);
  const label = escapeSvgText(config.label.toUpperCase());

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${config.placeholderWidth}" height="${config.placeholderHeight}" viewBox="0 0 ${config.placeholderWidth} ${config.placeholderHeight}" fill="none">
  <defs>
    <linearGradient id="venusGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1120" />
      <stop offset="55%" stop-color="#171329" />
      <stop offset="100%" stop-color="#2a1838" />
    </linearGradient>
    <radialGradient id="venusGlow" cx="0" cy="0" r="1" gradientTransform="translate(${Math.round(config.placeholderWidth * 0.18)} ${Math.round(config.placeholderHeight * 0.78)}) rotate(12) scale(${Math.round(config.placeholderWidth * 0.28)} ${Math.round(config.placeholderHeight * 0.16)})">
      <stop stop-color="${config.placeholderAccent}" stop-opacity="0.46" />
      <stop offset="1" stop-color="${config.placeholderAccent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${config.placeholderWidth}" height="${config.placeholderHeight}" rx="${Math.round(config.placeholderWidth * 0.06)}" fill="url(#venusGradient)" />
  <rect width="${config.placeholderWidth}" height="${config.placeholderHeight}" rx="${Math.round(config.placeholderWidth * 0.06)}" fill="url(#venusGlow)" />
  <circle cx="${Math.round(config.placeholderWidth * 0.24)}" cy="${Math.round(config.placeholderHeight * 0.74)}" r="${Math.round(config.placeholderWidth * 0.18)}" fill="${config.placeholderAccent}" fill-opacity="0.08" stroke="${config.placeholderAccent}" stroke-opacity="0.2" stroke-width="2" />
  <g fill="#cdd7ff" fill-opacity="0.55">
    <circle cx="${Math.round(config.placeholderWidth * 0.14)}" cy="${Math.round(config.placeholderHeight * 0.18)}" r="2" />
    <circle cx="${Math.round(config.placeholderWidth * 0.38)}" cy="${Math.round(config.placeholderHeight * 0.12)}" r="1.5" />
    <circle cx="${Math.round(config.placeholderWidth * 0.64)}" cy="${Math.round(config.placeholderHeight * 0.2)}" r="2" />
    <circle cx="${Math.round(config.placeholderWidth * 0.86)}" cy="${Math.round(config.placeholderHeight * 0.16)}" r="1.5" />
    <circle cx="${Math.round(config.placeholderWidth * 0.78)}" cy="${Math.round(config.placeholderHeight * 0.68)}" r="2" />
  </g>
  <text x="${Math.round(config.placeholderWidth * 0.08)}" y="${Math.round(config.placeholderHeight * 0.16)}" fill="${config.placeholderAccent}" fill-opacity="0.86" font-family="Inter, Arial, sans-serif" font-size="${Math.round(config.placeholderWidth * 0.035)}" letter-spacing="${Math.max(4, Math.round(config.placeholderWidth * 0.006))}">${label}</text>
  <text x="${Math.round(config.placeholderWidth * 0.08)}" y="${Math.round(config.placeholderHeight * 0.3)}" fill="#f6f1ff" font-family="Inter, Arial, sans-serif" font-size="${Math.round(config.placeholderWidth * 0.075)}" font-weight="700">VENUS</text>
  <text x="${Math.round(config.placeholderWidth * 0.08)}" y="${Math.round(config.placeholderHeight * 0.38)}" fill="#b9b3d9" font-family="Inter, Arial, sans-serif" font-size="${Math.round(config.placeholderWidth * 0.028)}">Upload a private image in /manage to replace this placeholder.</text>
</svg>`;
}

export function resolveVenusImagePath(slot: VenusImageSlot): ResolvedVenusImage {
  for (const candidate of getVenusImageCandidates(slot)) {
    if (existsSync(candidate.filePath)) {
      const stats = statSync(candidate.filePath);
      return {
        exists: true,
        fileName: candidate.fileName,
        filePath: candidate.filePath,
        sizeBytes: stats.size,
        slot,
        source: "volume",
        updatedAt: stats.mtime.toISOString()
      };
    }
  }

  return {
    exists: false,
    fileName: `${getSlotConfig(slot).basename}.svg`,
    filePath: null,
    sizeBytes: null,
    slot,
    source: "placeholder",
    svgFallback: buildVenusPlaceholderSvg(slot),
    updatedAt: null
  };
}

export function sanitizeVenusImageFileName(slot: VenusImageSlot, raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("A file name is required.");
  }

  const baseName = path.basename(trimmed);
  if (baseName !== trimmed) {
    throw new Error("File names must not contain path separators.");
  }

  const extension = path.extname(baseName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Only .jpeg, .jpg, .png, .webp, and .avif files are supported.");
  }

  return `${getSlotConfig(slot).basename}${extension}`;
}

export function removeExistingVenusImageVariants(slot: VenusImageSlot) {
  for (const candidate of getVenusImageCandidates(slot)) {
    if (existsSync(candidate.filePath)) {
      rmSync(candidate.filePath, { force: true });
    }
  }
}
