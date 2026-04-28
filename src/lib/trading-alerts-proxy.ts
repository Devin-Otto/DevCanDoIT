import type { NextRequest } from "next/server";

export const TRADING_ALERTS_BASE_PATH = "/tradingalerts";

function getTradingAlertsInternalUrl() {
  const configured = process.env.TRADING_ALERTS_INTERNAL_URL?.trim();
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:2468";
}

function getTradingAlertsProxySharedSecret() {
  const secret = process.env.TRADING_ALERTS_PROXY_SHARED_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("TRADING_ALERTS_PROXY_SHARED_SECRET must be set when Trading Alerts proxy routes are enabled.");
  }

  return "local-dev-trading-alerts-proxy";
}

export function assertTradingAlertsProxyConfigured() {
  if (!getTradingAlertsInternalUrl()) {
    throw new Error("TRADING_ALERTS_INTERNAL_URL must be set when Trading Alerts proxy routes are enabled.");
  }

  getTradingAlertsProxySharedSecret();
}

export function getTradingAlertsUpstreamUrl(request: NextRequest, pathSegments?: string[]) {
  const base = getTradingAlertsInternalUrl();
  if (!base) {
    return null;
  }

  const pathSuffix = pathSegments?.length ? `/${pathSegments.map(encodeURIComponent).join("/")}` : "/";
  const upstream = new URL(pathSuffix, base.endsWith("/") ? base : `${base}/`);
  upstream.search = request.nextUrl.search;
  return upstream;
}

export function buildTradingAlertsForwardHeaders(request: NextRequest) {
  const headers = new Headers();
  const passThroughHeaders = ["accept", "accept-language", "cache-control", "content-type", "pragma", "user-agent"];

  for (const name of passThroughHeaders) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  headers.set("x-forwarded-host", request.headers.get("host") || request.nextUrl.host);
  headers.set("x-forwarded-prefix", TRADING_ALERTS_BASE_PATH);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(/:$/u, ""));
  headers.set("X-DevCanDoIt-Proxy-Key", getTradingAlertsProxySharedSecret());

  return headers;
}

export function rewriteTradingAlertsLocation(location: string | null, upstreamUrl: URL) {
  if (!location) {
    return null;
  }

  if (location === TRADING_ALERTS_BASE_PATH || location.startsWith(`${TRADING_ALERTS_BASE_PATH}/`)) {
    return location;
  }

  if (location.startsWith("/") && !location.startsWith("//")) {
    return `${TRADING_ALERTS_BASE_PATH}${location === "/" ? "" : location}`;
  }

  try {
    const parsed = new URL(location);
    if (parsed.origin === upstreamUrl.origin) {
      return rewriteTradingAlertsLocation(`${parsed.pathname}${parsed.search}${parsed.hash}`, upstreamUrl);
    }
  } catch {
    return location;
  }

  return location;
}

export async function forwardTradingAlertsRequest(args: {
  pathSegments?: string[];
  request: NextRequest;
}) {
  const upstreamUrl = getTradingAlertsUpstreamUrl(args.request, args.pathSegments);
  if (!upstreamUrl) {
    return new Response("Trading Alerts upstream is not configured.", { status: 503 });
  }

  const method = args.request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await args.request.arrayBuffer();

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      body,
      cache: "no-store",
      headers: buildTradingAlertsForwardHeaders(args.request),
      method,
      redirect: "manual",
    });
    const responseHeaders = new Headers();

    for (const [key, value] of upstreamResponse.headers.entries()) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === "set-cookie") {
        continue;
      }
      if (normalizedKey === "location") {
        const rewritten = rewriteTradingAlertsLocation(value, upstreamUrl);
        if (rewritten) {
          responseHeaders.set("location", rewritten);
        }
        continue;
      }
      responseHeaders.append(key, value);
    }

    return new Response(upstreamResponse.body, {
      headers: responseHeaders,
      status: upstreamResponse.status,
    });
  } catch {
    return new Response("Trading Alerts is temporarily unavailable.", { status: 502 });
  }
}
