import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_TILEOS_INTERNAL_URL =
  process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:9273";

function getTileOSInternalUrl() {
  return process.env.TILEOS_INTERNAL_URL?.trim() || FALLBACK_TILEOS_INTERNAL_URL;
}

function buildUpstreamUrl(request: NextRequest, pathSegments?: string[]) {
  const base = getTileOSInternalUrl();
  if (!base) return null;

  const pathSuffix = pathSegments?.length ? `/${pathSegments.join("/")}` : "/";
  const upstream = new URL(pathSuffix, base.endsWith("/") ? base : `${base}/`);
  upstream.search = request.nextUrl.search;
  return upstream;
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();
  const passThroughHeaders = [
    "accept",
    "accept-language",
    "cache-control",
    "content-type",
    "cookie",
    "origin",
    "pragma",
    "referer",
    "user-agent",
    "x-forwarded-for"
  ];

  for (const name of passThroughHeaders) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  headers.set(
    "x-forwarded-host",
    request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host
  );
  headers.set(
    "x-forwarded-proto",
    request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(/:$/u, "")
  );
  headers.set("x-forwarded-prefix", "/tileos/app");

  return headers;
}

async function proxyTileOS(request: NextRequest, pathSegments?: string[]) {
  const upstreamUrl = buildUpstreamUrl(request, pathSegments);

  if (!upstreamUrl) {
    return new Response("TileOS upstream is not configured.", { status: 503 });
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: buildForwardHeaders(request),
    redirect: "manual",
    cache: "no-store"
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
    init.duplex = "half";
  }

  const upstreamResponse = await fetch(upstreamUrl, init);
  const responseHeaders = new Headers();

  for (const [key, value] of upstreamResponse.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    responseHeaders.append(key, value);
  }

  const getSetCookie = upstreamResponse.headers.getSetCookie?.bind(upstreamResponse.headers);
  const setCookies = getSetCookie ? getSetCookie() : [];
  if (setCookies.length) {
    for (const cookie of setCookies) {
      responseHeaders.append("set-cookie", cookie);
    }
  } else {
    const singleCookie = upstreamResponse.headers.get("set-cookie");
    if (singleCookie) {
      responseHeaders.append("set-cookie", singleCookie);
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders
  });
}

interface TileOSProxyRouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

export async function GET(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOS(request, path);
}

export async function HEAD(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOS(request, path);
}

export async function POST(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOS(request, path);
}

export async function PUT(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOS(request, path);
}

export async function PATCH(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOS(request, path);
}

export async function DELETE(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOS(request, path);
}

export async function OPTIONS(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOS(request, path);
}
