import { NextRequest } from "next/server";

import { getTileOSAppUpstreamUrl } from "@/lib/tileos-public-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();
  const passThroughHeaders = ["accept", "accept-language", "cache-control", "pragma", "user-agent"];

  for (const name of passThroughHeaders) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  headers.set("x-forwarded-host", request.headers.get("host") || request.nextUrl.host);
  headers.set("x-forwarded-prefix", "/tileos/app");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(/:$/u, ""));

  return headers;
}

async function proxyTileOSShell(request: NextRequest, pathSegments?: string[]) {
  if (pathSegments?.[0] === "api") {
    return new Response("Not Found", { status: 404 });
  }

  const upstreamUrl = getTileOSAppUpstreamUrl(request, pathSegments);
  if (!upstreamUrl) {
    return new Response("TileOS upstream is not configured.", { status: 503 });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: buildForwardHeaders(request),
      method: request.method,
      redirect: "manual",
    });
    const responseHeaders = new Headers();

    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (key.toLowerCase() === "set-cookie") {
        continue;
      }
      responseHeaders.append(key, value);
    }

    return new Response(upstreamResponse.body, {
      headers: responseHeaders,
      status: upstreamResponse.status,
    });
  } catch {
    return new Response("TileOS is temporarily unavailable.", { status: 502 });
  }
}

interface TileOSProxyRouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

export async function GET(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOSShell(request, path);
}

export async function HEAD(request: NextRequest, context: TileOSProxyRouteContext) {
  const { path } = await context.params;
  return proxyTileOSShell(request, path);
}
