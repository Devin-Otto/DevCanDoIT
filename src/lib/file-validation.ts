import { open } from "fs/promises";
import path from "path";

import { fileTypeFromBuffer } from "file-type/core";

type MediaKind = "image" | "video";

type ValidatedMedia = {
  contentType: string;
};

const FILE_TYPE_BYTES = 4100;
const IMAGE_SIGNATURES = new Map<string, string[]>([
  [".avif", ["image/avif"]],
  [".jpg", ["image/jpeg"]],
  [".jpeg", ["image/jpeg"]],
  [".png", ["image/png"]],
  [".webp", ["image/webp"]],
]);
const VIDEO_SIGNATURES = new Map<string, string[]>([
  [".m4v", ["video/mp4", "video/x-m4v"]],
  [".mov", ["video/quicktime"]],
  [".mp4", ["video/mp4"]],
]);

function getAllowedMimeMap(kind: MediaKind) {
  return kind === "image" ? IMAGE_SIGNATURES : VIDEO_SIGNATURES;
}

function normalizeContentType(contentType: string | null | undefined) {
  if (!contentType) {
    return null;
  }

  return contentType.split(";")[0]?.trim().toLowerCase() || null;
}

function getAllowedMimes(kind: MediaKind, fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const allowed = getAllowedMimeMap(kind).get(extension);

  if (!allowed) {
    throw new Error(`Unsupported ${kind} file extension.`);
  }

  return allowed;
}

async function readLeadingBytes(filePath: string) {
  const handle = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(FILE_TYPE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function validateMediaBuffer(args: {
  buffer: Buffer;
  contentType: string | null | undefined;
  fileName: string;
  kind: MediaKind;
}) {
  const allowedMimes = getAllowedMimes(args.kind, args.fileName);
  const declaredContentType = normalizeContentType(args.contentType);
  const detected = await fileTypeFromBuffer(args.buffer);

  if (!detected || !allowedMimes.includes(detected.mime)) {
    throw new Error(`Uploaded ${args.kind} content does not match the expected file type.`);
  }

  if (declaredContentType && declaredContentType !== "application/octet-stream" && !allowedMimes.includes(declaredContentType)) {
    throw new Error(`Uploaded ${args.kind} content type is not allowed for this file.`);
  }

  return {
    contentType: detected.mime,
  } satisfies ValidatedMedia;
}

export async function validateUploadedFilePath(args: {
  contentType: string | null | undefined;
  fileName: string;
  filePath: string;
  kind: MediaKind;
}) {
  const buffer = await readLeadingBytes(args.filePath);
  return validateMediaBuffer({
    buffer,
    contentType: args.contentType,
    fileName: args.fileName,
    kind: args.kind,
  });
}

export async function validateUploadedBuffer(args: {
  buffer: Buffer;
  contentType: string | null | undefined;
  fileName: string;
  kind: MediaKind;
}) {
  return validateMediaBuffer(args);
}
