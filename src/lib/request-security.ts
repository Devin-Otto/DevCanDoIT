import type { NextRequest } from "next/server";

const rateLimitStore = globalThis as typeof globalThis & {
  __devcandoitRateLimit?: Map<string, { count: number; resetAt: number }>;
};

function getRateLimitMap() {
  if (!rateLimitStore.__devcandoitRateLimit) {
    rateLimitStore.__devcandoitRateLimit = new Map();
  }

  return rateLimitStore.__devcandoitRateLimit;
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function getAllowedOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // ignore invalid configuration and fall back to the request origin
    }
  }

  return request.nextUrl.origin;
}

export function assertAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return parsed.origin === getAllowedOrigin(request);
  } catch {
    return false;
  }
}

export function assertRateLimit(
  request: NextRequest,
  key: string,
  options: { limit: number; windowMs: number },
) {
  const map = getRateLimitMap();
  const bucketKey = `${key}:${getClientIp(request)}`;
  const now = Date.now();
  const bucket = map.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    map.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1 };
  }

  if (bucket.count >= options.limit) {
    return { ok: false, remaining: 0, retryAt: bucket.resetAt };
  }

  bucket.count += 1;
  map.set(bucketKey, bucket);
  return { ok: true, remaining: options.limit - bucket.count };
}
