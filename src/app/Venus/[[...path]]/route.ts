import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { VENUS_COOKIE_NAME, isVenusGateConfigured, verifyVenusSessionToken } from "@/lib/venus-auth";

export const runtime = "nodejs";

const VENUS_PUBLIC_ROOT = path.join(process.cwd(), "public", "Venus");

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

function getRedirectOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to forwarded headers.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(/:$/u, "");
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function buildRedirectUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, getRedirectOrigin(request));
}

function getMimeType(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function resolveRequestedAsset(pathSegments: string[] | undefined) {
  const requestedRelativePath = pathSegments?.length ? pathSegments.join("/") : "index.html";
  const normalizedRelativePath = path.posix.normalize(requestedRelativePath).replace(/^(\.\.\/)+/u, "");
  const resolvedPath = path.resolve(VENUS_PUBLIC_ROOT, normalizedRelativePath);

  if (!resolvedPath.startsWith(`${VENUS_PUBLIC_ROOT}${path.sep}`) && resolvedPath !== VENUS_PUBLIC_ROOT) {
    return null;
  }

  return {
    hasExtension: path.extname(normalizedRelativePath).length > 0,
    relativePath: normalizedRelativePath,
    resolvedPath
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

async function isAuthorized(request: NextRequest) {
  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await verifyAdminSessionToken(adminToken)) {
    return true;
  }

  const venusToken = request.cookies.get(VENUS_COOKIE_NAME)?.value;
  return verifyVenusSessionToken(venusToken);
}

async function serveAsset(filePath: string) {
  const fileStats = await stat(filePath);
  const headers = new Headers({
    "Cache-Control": filePath.endsWith(".html") || filePath.endsWith(".json") || filePath.endsWith(".webmanifest")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    "Content-Length": String(fileStats.size),
    "Content-Type": getMimeType(filePath)
  });

  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    headers,
    status: 200
  });
}

async function handleRequest(request: NextRequest, pathSegments: string[] | undefined) {
  if (isVenusGateConfigured() && !(await isAuthorized(request))) {
    const requestedAsset = resolveRequestedAsset(pathSegments);
    const nextPath = request.nextUrl.pathname + request.nextUrl.search;

    if (requestedAsset?.relativePath === "index.html" || requestedAsset?.relativePath.endsWith(".html")) {
      const loginUrl = buildRedirectUrl(request, "/venus-login");
      loginUrl.searchParams.set("next", "/Venus");
      return NextResponse.redirect(loginUrl);
    }

    if (requestedAsset?.hasExtension) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const loginUrl = buildRedirectUrl(request, "/venus-login");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const requestedAsset = resolveRequestedAsset(pathSegments);
  if (!requestedAsset) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (await fileExists(requestedAsset.resolvedPath)) {
    return serveAsset(requestedAsset.resolvedPath);
  }

  if (requestedAsset.hasExtension) {
    return new NextResponse("Not found", { status: 404 });
  }

  return serveAsset(path.join(VENUS_PUBLIC_ROOT, "index.html"));
}

interface VenusAssetRouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

export async function GET(request: NextRequest, context: VenusAssetRouteContext) {
  const { path: pathSegments } = await context.params;
  return handleRequest(request, pathSegments);
}

export async function HEAD(request: NextRequest, context: VenusAssetRouteContext) {
  const response = await GET(request, context);
  return new Response(null, {
    headers: response.headers,
    status: response.status
  });
}
