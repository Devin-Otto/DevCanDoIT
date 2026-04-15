import { NextRequest, NextResponse } from "next/server";

import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
import {
  isVenusGateConfigured,
  issueVenusDesktopSyncToken,
  verifyVenusCredentials
} from "@/lib/venus-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isVenusGateConfigured()) {
      return NextResponse.json({ error: "Private access is not configured." }, { status: 503 });
    }

    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rateLimit = assertRateLimit(request, "venus-sync-login", { limit: 8, windowMs: 15 * 60 * 1000 });
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    if (!verifyVenusCredentials(username, password)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      token: await issueVenusDesktopSyncToken(username)
    });
  } catch {
    return NextResponse.json({ error: "Unable to sign in to sync right now." }, { status: 500 });
  }
}
