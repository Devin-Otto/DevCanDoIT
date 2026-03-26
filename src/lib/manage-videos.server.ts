import path from "path";
import { existsSync, statSync } from "fs";

import { videoShowcase } from "@/lib/site";
import { resolveVideoAssetPath, getVideoAssetRoot } from "@/lib/video-assets";
import type { ManagedVideoFile } from "@/lib/video-types";

const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".m4v", ".mov"]);

function normalizeUploadedFileName(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("A file name is required.");
  }

  const baseName = path.basename(trimmed);
  if (baseName !== trimmed) {
    throw new Error("File names must not contain path separators.");
  }

  return baseName;
}

export function sanitizeUploadedVideoFileName(raw: string) {
  const fileName = normalizeUploadedFileName(raw);
  const extension = path.extname(fileName).toLowerCase();

  if (!ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
    throw new Error("Only .mp4, .m4v, and .mov files are supported.");
  }

  return fileName;
}

export function listManagedVideos(): ManagedVideoFile[] {
  return videoShowcase.map((item) => {
    const filePath = resolveVideoAssetPath(item.fileName);

    if (!existsSync(filePath)) {
      return {
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        fileName: item.fileName,
        src: item.src,
        exists: false,
        sizeBytes: null,
        updatedAt: null,
      };
    }

    const stats = statSync(filePath);
    return {
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      fileName: item.fileName,
      src: item.src,
      exists: true,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
    };
  });
}

export function getManagedVideoAssetRoot() {
  return getVideoAssetRoot();
}

