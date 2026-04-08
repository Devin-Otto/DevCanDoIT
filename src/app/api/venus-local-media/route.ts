import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { NextRequest } from "next/server";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".aac": "audio/aac",
  ".aiff": "audio/aiff",
  ".alac": "audio/mp4",
  ".avi": "video/x-msvideo",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".m4v": "video/mp4",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "video/webm"
};

function getMimeType(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function parseByteRange(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/u.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const startValue = match[1] ? Number.parseInt(match[1], 10) : Number.NaN;
  const endValue = match[2] ? Number.parseInt(match[2], 10) : Number.NaN;

  if (Number.isNaN(startValue) && Number.isNaN(endValue)) {
    return null;
  }

  let start = Number.isNaN(startValue) ? 0 : startValue;
  let end = Number.isNaN(endValue) ? fileSize - 1 : endValue;

  if (Number.isNaN(startValue) && !Number.isNaN(endValue)) {
    start = Math.max(fileSize - endValue, 0);
    end = fileSize - 1;
  }

  if (start < 0 || end < start || start >= fileSize) {
    return null;
  }

  return {
    end: Math.min(end, fileSize - 1),
    start
  };
}

export async function GET(request: NextRequest) {
  const isLocalHost = request.nextUrl.hostname === "127.0.0.1" || request.nextUrl.hostname === "localhost";

  if (process.env.NODE_ENV === "production" && !isLocalHost) {
    return new Response("Not found", { status: 404 });
  }

  const requestedPath = request.nextUrl.searchParams.get("path");
  if (!requestedPath) {
    return new Response("Missing file path.", { status: 400 });
  }

  const normalizedPath = path.normalize(requestedPath);
  if (!path.isAbsolute(normalizedPath)) {
    return new Response("Only absolute local media paths are supported.", { status: 403 });
  }

  let fileStats;
  try {
    fileStats = await stat(normalizedPath);
  } catch {
    return new Response("Local media file not found.", { status: 404 });
  }

  if (!fileStats.isFile()) {
    return new Response("Local media file not found.", { status: 404 });
  }

  const byteRange = parseByteRange(request.headers.get("range"), fileStats.size);
  const stream = byteRange
    ? createReadStream(normalizedPath, { start: byteRange.start, end: byteRange.end })
    : createReadStream(normalizedPath);

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Type": getMimeType(normalizedPath)
  });

  if (byteRange) {
    headers.set("Content-Length", String(byteRange.end - byteRange.start + 1));
    headers.set("Content-Range", `bytes ${byteRange.start}-${byteRange.end}/${fileStats.size}`);
  } else {
    headers.set("Content-Length", String(fileStats.size));
  }

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: byteRange ? 206 : 200,
    headers
  });
}
