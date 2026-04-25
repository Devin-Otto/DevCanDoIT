import type { NextRequest } from "next/server";

import { checkPersistentRateLimit } from "@/lib/auth-state";

function getConfiguredOrigins(request: NextRequest) {
  const configuredOrigins = (process.env.TRUSTED_MUTATION_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = new Set<string>();

  for (const origin of configuredOrigins) {
    try {
      origins.add(new URL(origin).origin);
    } catch {
      // Ignore invalid entries so one bad value does not disable all checks.
    }
  }

  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (publicSiteUrl) {
    try {
      origins.add(new URL(publicSiteUrl).origin);
    } catch {
      // Ignore invalid configuration here. site.ts will fail fast in production.
    }
  }

  if (process.env.NODE_ENV !== "production" && origins.size === 0) {
    origins.add(request.nextUrl.origin);
  }

  return origins;
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

export function assertAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return getConfiguredOrigins(request).has(parsed.origin);
  } catch {
    return false;
  }
}

export async function assertRateLimit(
  request: NextRequest,
  key: string,
  options: { limit: number; windowMs: number },
) {
  return checkPersistentRateLimit(`${key}:${getClientIp(request)}`, options);
}
