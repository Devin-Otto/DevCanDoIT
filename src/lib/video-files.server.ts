import path from "path";

const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".m4v", ".mov"]);

export function sanitizeUploadedVideoFileName(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("A file name is required.");
  }

  const baseName = path.basename(trimmed);
  if (baseName !== trimmed) {
    throw new Error("File names must not contain path separators.");
  }

  const extension = path.extname(baseName).toLowerCase();
  if (!ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
    throw new Error("Only .mp4, .m4v, and .mov files are supported.");
  }

  return baseName;
}

export function getVideoContentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".m4v":
      return "video/x-m4v";
    case ".mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}
