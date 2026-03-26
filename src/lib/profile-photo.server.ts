import path from "path";
import { existsSync, rmSync, statSync } from "fs";

import { getVideoAssetRoot } from "@/lib/video-assets";

const PROFILE_PHOTO_BASENAME = "profilephoto";
const FALLBACK_PROFILE_PHOTO = path.join(process.cwd(), "public", "profilephoto.jpeg");
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

  if (existsSync(FALLBACK_PROFILE_PHOTO)) {
    const stats = statSync(FALLBACK_PROFILE_PHOTO);
    return {
      filePath: FALLBACK_PROFILE_PHOTO,
      fileName: "profilephoto.jpeg",
      exists: true,
      source: "fallback" as const,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
    };
  }

  return {
    filePath: FALLBACK_PROFILE_PHOTO,
    fileName: "profilephoto.jpeg",
    exists: false,
    source: "missing" as const,
    sizeBytes: null,
    updatedAt: null,
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
