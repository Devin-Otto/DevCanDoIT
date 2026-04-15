import { NextRequest, NextResponse } from "next/server";

import { getAdminCookieDomain } from "@/lib/admin-auth";
import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
import { isVenusGateConfigured, issueVenusSessionToken, VENUS_COOKIE_NAME, verifyVenusCredentials } from "@/lib/venus-auth";

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

    const rateLimit = assertRateLimit(request, "venus-login", { limit: 8, windowMs: 15 * 60 * 1000 });
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

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: VENUS_COOKIE_NAME,
      value: await issueVenusSessionToken(username),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      domain: getAdminCookieDomain()
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
