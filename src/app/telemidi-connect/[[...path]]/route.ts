import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { NextRequest } from "next/server";

export const runtime = "nodejs";

const TELEMIDI_PUBLIC_ROOT = path.join(process.cwd(), "public", "telemidi-connect");
const TELEMIDI_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com",
  "frame-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function getMimeType(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function resolveRequestedAsset(pathSegments: string[] | undefined) {
  const requestedRelativePath = pathSegments?.length ? pathSegments.join("/") : "index.html";
  const normalizedRelativePath = path.posix.normalize(requestedRelativePath).replace(/^(\.\.\/)+/u, "");
  const resolvedPath = path.resolve(TELEMIDI_PUBLIC_ROOT, normalizedRelativePath);

  if (!resolvedPath.startsWith(`${TELEMIDI_PUBLIC_ROOT}${path.sep}`) && resolvedPath !== TELEMIDI_PUBLIC_ROOT) {
    return null;
  }

  return {
    hasExtension: path.extname(normalizedRelativePath).length > 0,
    resolvedPath,
  };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    const fileStats = await stat(filePath);
    return fileStats.isFile();
  } catch {
    return false;
  }
}

async function serveAsset(filePath: string) {
  const fileStats = await stat(filePath);
  const headers = new Headers({
    "Cache-Control": filePath.endsWith(".html") || filePath.endsWith(".json") || filePath.endsWith(".webmanifest")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    "Content-Security-Policy": TELEMIDI_CSP,
    "Content-Length": String(fileStats.size),
    "Content-Type": getMimeType(filePath),
  });

  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    headers,
    status: 200,
  });
}

async function handleRequest(pathSegments: string[] | undefined) {
  const requestedAsset = resolveRequestedAsset(pathSegments);
  if (!requestedAsset) {
    return new Response("Not found", { status: 404 });
  }

  if (await fileExists(requestedAsset.resolvedPath)) {
    return serveAsset(requestedAsset.resolvedPath);
  }

  if (requestedAsset.hasExtension) {
    return new Response("Not found", { status: 404 });
  }

  const indexPath = path.join(TELEMIDI_PUBLIC_ROOT, "index.html");
  if (!(await fileExists(indexPath))) {
    return new Response("TeleMIDI build not synced", { status: 404 });
  }

  return serveAsset(indexPath);
}

interface TelemidiAssetRouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

export async function GET(_request: NextRequest, context: TelemidiAssetRouteContext) {
  const { path: pathSegments } = await context.params;
  return handleRequest(pathSegments);
}

export async function HEAD(request: NextRequest, context: TelemidiAssetRouteContext) {
  const response = await GET(request, context);
  return new Response(null, {
    headers: response.headers,
    status: response.status,
  });
}
