import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { DEFAULT_ORIGIN, DEFAULT_SCAN_LIMIT, DEFAULT_SCAN_RADIUS_METERS } from "@/lib/lead-types";
import { createLeadScanJob } from "@/lib/lead-finder";
import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toFiniteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function POST(request: NextRequest) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = assertRateLimit(request, "lead-scan", { limit: 4, windowMs: 10 * 60 * 1000 });
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Please wait before starting another scan." }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const latitude = toFiniteNumber(body.latitude, DEFAULT_ORIGIN.latitude);
    const longitude = toFiniteNumber(body.longitude, DEFAULT_ORIGIN.longitude);
    const radiusMeters = clamp(
      Math.round(toFiniteNumber(body.radiusMeters, DEFAULT_SCAN_RADIUS_METERS)),
      1000,
      100000,
    );
    const limit = clamp(Math.round(toFiniteNumber(body.limit, DEFAULT_SCAN_LIMIT)), 20, 250);

    const job = await createLeadScanJob({
      latitude,
      longitude,
      radiusMeters,
      limit,
    });
    return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to scan nearby businesses.",
      },
      { status: 500 },
    );
  }
}
