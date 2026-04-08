import path from "path";
import { existsSync, rmSync, statSync } from "fs";

import { getVideoAssetRoot } from "@/lib/video-assets";

const PROFILE_PHOTO_BASENAME = "profilephoto";
const ALLOWED_EXTENSIONS = new Set([".jpeg", ".jpg", ".png", ".webp", ".avif"]);

export function getProfilePhotoAssetRoot() {
  return process.env.PROFILE_PHOTO_ASSET_ROOT?.trim() || getVideoAssetRoot();
}

function buildProfilePhotoPath(extension: string) {
  return path.join(getProfilePhotoAssetRoot(), `${PROFILE_PHOTO_BASENAME}${extension}`);
}

export function getProfilePhotoCandidates() {
  return [".jpeg", ".jpg", ".png", ".webp", ".avif"].map((extension) => ({
    extension,
    filePath: buildProfilePhotoPath(extension),
    fileName: `${PROFILE_PHOTO_BASENAME}${extension}`,
  }));
}

export function resolveProfilePhotoPath() {
  for (const candidate of getProfilePhotoCandidates()) {
    if (existsSync(candidate.filePath)) {
      const stats = statSync(candidate.filePath);
      return {
        filePath: candidate.filePath,
        fileName: candidate.fileName,
        exists: true,
        source: "volume" as const,
        sizeBytes: stats.size,
        updatedAt: stats.mtime.toISOString(),
      };
    }
  }

  return {
    filePath: null,
    fileName: "profilephoto.svg",
    exists: false,
    source: "fallback" as const,
    sizeBytes: null,
    updatedAt: null,
    svgFallback: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="none">
  <defs>
    <linearGradient id="profileGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="60%" stop-color="#1a1430" />
      <stop offset="100%" stop-color="#26163a" />
    </linearGradient>
    <radialGradient id="profileGlow" cx="0" cy="0" r="1" gradientTransform="translate(220 760) rotate(8) scale(280 180)">
      <stop stop-color="#8dd0ff" stop-opacity="0.4" />
      <stop offset="1" stop-color="#8dd0ff" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" rx="120" fill="url(#profileGradient)" />
  <rect width="1024" height="1024" rx="120" fill="url(#profileGlow)" />
  <circle cx="512" cy="410" r="164" fill="#cf8fff" fill-opacity="0.18" stroke="#cf8fff" stroke-opacity="0.38" stroke-width="20" />
  <path d="M268 814c0-136 110-246 246-246s246 110 246 246" fill="#7cc8ff" fill-opacity="0.14" stroke="#7cc8ff" stroke-opacity="0.38" stroke-width="20" stroke-linecap="round" />
  <text x="112" y="160" fill="#8dd0ff" fill-opacity="0.88" font-family="Inter, Arial, sans-serif" font-size="36" letter-spacing="6">PROFILE IMAGE</text>
  <text x="112" y="240" fill="#f6f1ff" font-family="Inter, Arial, sans-serif" font-size="92" font-weight="700">Upload in /manage</text>
</svg>`
  };
}

export function sanitizeProfilePhotoFileName(raw: string) {
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

  return `${PROFILE_PHOTO_BASENAME}${extension}`;
}

export function removeExistingProfilePhotoVariants() {
  for (const candidate of getProfilePhotoCandidates()) {
    if (existsSync(candidate.filePath)) {
      rmSync(candidate.filePath, { force: true });
    }
  }
}
