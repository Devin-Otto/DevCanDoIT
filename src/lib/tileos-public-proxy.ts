import type { NextRequest } from "next/server";

const MAX_TILEOS_PUBLIC_BODY_BYTES = 16 * 1024;
const DRAFT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/u;

function getTileOSInternalUrl() {
  const configured = process.env.TILEOS_INTERNAL_URL?.trim();
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:9273";
}

function getTileOSProxySharedSecret() {
  const secret = process.env.TILEOS_PROXY_SHARED_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("TILEOS_PROXY_SHARED_SECRET must be set when TileOS public routes are enabled.");
  }

  return "local-dev-tileos-proxy";
}

export function assertTileOSPublicProxyConfigured() {
  if (!getTileOSInternalUrl()) {
    throw new Error("TILEOS_INTERNAL_URL must be set when TileOS public routes are enabled.");
  }

  getTileOSProxySharedSecret();
}

export function getTileOSAppUpstreamUrl(request: NextRequest, pathSegments?: string[]) {
  const base = getTileOSInternalUrl();
  if (!base) {
    return null;
  }

  const pathSuffix = pathSegments?.length ? `/${pathSegments.join("/")}` : "/";
  const upstream = new URL(pathSuffix, base.endsWith("/") ? base : `${base}/`);
  upstream.search = request.nextUrl.search;
  return upstream;
}

export function isValidTileOSDraftId(value: string) {
  return DRAFT_ID_PATTERN.test(value);
}

export function parseTileOSDraftCreateBody(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("A draft payload is required.");
  }

  const body = value as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!prompt) {
    throw new Error("A prompt is required.");
  }

  if (prompt.length > 4000) {
    throw new Error("Prompt is too long.");
  }

  if (title.length > 120) {
    throw new Error("Title is too long.");
  }

  return {
    prompt,
    ...(title ? { title } : {}),
  };
}

export function parseTileOSDraftGenerateBody(value: unknown) {
  if (value == null) {
    return {};
  }

  if (typeof value !== "object") {
    throw new Error("Generate payload must be an object.");
  }

  const body = value as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (prompt.length > 4000) {
    throw new Error("Prompt is too long.");
  }

  return prompt ? { prompt } : {};
}

export async function readTileOSPublicJsonBody(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_TILEOS_PUBLIC_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  const raw = await request.text();
  if (!raw.trim()) {
    return {};
  }

  if (raw.length > MAX_TILEOS_PUBLIC_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JSON body must be an object.");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

export async function forwardTileOSPublicJson(args: {
  body?: Record<string, unknown>;
  method: "GET" | "POST";
  request: NextRequest;
  upstreamPath: string;
}) {
  const base = getTileOSInternalUrl();
  if (!base) {
    return new Response(JSON.stringify({ error: "TileOS is temporarily unavailable." }), {
      headers: {
        "Content-Type": "application/json",
      },
      status: 503,
    });
  }

  const upstreamUrl = new URL(args.upstreamPath, base.endsWith("/") ? base : `${base}/`);
  upstreamUrl.search = args.request.nextUrl.search;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      body: args.body ? JSON.stringify(args.body) : undefined,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": args.request.headers.get("user-agent") || "DevCanDoIt TileOS Proxy",
        "X-DevCanDoIt-Proxy-Key": getTileOSProxySharedSecret(),
      },
      method: args.method,
      redirect: "manual",
    });

    const responseText = await upstreamResponse.text();
    let responseBody: Record<string, unknown> = {};

    if (responseText.trim()) {
      try {
        const parsed = JSON.parse(responseText) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          responseBody = parsed as Record<string, unknown>;
        }
      } catch {
        responseBody = {};
      }
    }

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({
          error:
            typeof responseBody.error === "string"
              ? responseBody.error
              : "TileOS request could not be completed.",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: upstreamResponse.status,
        },
      );
    }

    return new Response(JSON.stringify(responseBody), {
      headers: {
        "Content-Type": "application/json",
      },
      status: upstreamResponse.status,
    });
  } catch {
    return new Response(JSON.stringify({ error: "TileOS is temporarily unavailable." }), {
      headers: {
        "Content-Type": "application/json",
      },
      status: 502,
    });
  }
}
