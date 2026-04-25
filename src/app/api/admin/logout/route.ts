import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, getAdminCookieDomain, revokeAdminSessionToken } from "@/lib/admin-auth";
import { assertAllowedOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!assertAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await revokeAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    domain: getAdminCookieDomain(),
  });
  return response;
}
