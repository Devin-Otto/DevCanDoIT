import { NextRequest, NextResponse } from "next/server";

import { isPublicSiteOnly } from "@/lib/runtime-flags";
 
const ADMIN_COOKIE_NAME = "devcandoit_admin_session";
const VENUS_COOKIE_NAME = "devcandoit_venus_session";

function isVenusGateConfigured() {
  return Boolean(
    process.env.VENUS_GATE_USERNAME?.trim() &&
      ((process.env.VENUS_GATE_PASSWORD_SALT?.trim() && process.env.VENUS_GATE_PASSWORD_HASH?.trim()) ||
        process.env.VENUS_GATE_PASSWORD?.trim()),
  );
}

function hasAdminSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

function hasVenusSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(VENUS_COOKIE_NAME)?.value);
}

function hasVenusBearerAuth(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  return /^Bearer\s+\S+/iu.test(authorization);
}

function getRedirectOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to forwarded headers.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(/:$/u, "");
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function buildRedirectUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, getRedirectOrigin(request));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasAdminSessionCookie(request);
  const venusAuthed = hasVenusSessionCookie(request);
  const venusBearerAuthed = hasVenusBearerAuth(request);
  const isApiPath = pathname.startsWith("/api/");
  const isVenusPath =
    pathname === "/Venus" ||
    pathname.startsWith("/Venus/") ||
    pathname.startsWith("/venus-overlay") ||
    pathname.startsWith("/api/venus-overlay") ||
    pathname.startsWith("/api/private-workspace") ||
    pathname.startsWith("/api/venus-images") ||
    pathname.startsWith("/api/venus-local-media") ||
    pathname.startsWith("/api/venus-external-preview");
  const isInternalPath =
    pathname.startsWith("/admin") ||
    pathname === "/leads" ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/api/leads") ||
    pathname.startsWith("/api/admin");
  const isManagePath = pathname.startsWith("/manage") || pathname.startsWith("/api/manage");

  if (pathname === "/venus-login") {
    if (!isVenusGateConfigured()) {
      return NextResponse.redirect(buildRedirectUrl(request, "/Venus"));
    }

    if (authed || venusAuthed) {
      const nextPath = request.nextUrl.searchParams.get("next");
      const safeNextPath = nextPath && nextPath.startsWith("/") ? nextPath : "/Venus";
      return NextResponse.redirect(buildRedirectUrl(request, safeNextPath));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/venus-auth")) {
    return NextResponse.next();
  }

  if (isVenusPath && isVenusGateConfigured() && !authed && !venusAuthed && !(isApiPath && venusBearerAuthed)) {
    if (isApiPath) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = buildRedirectUrl(request, "/venus-login");
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicSiteOnly && isInternalPath) {
    if (isApiPath) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse("Not Found", { status: 404 });
  }

  if (isManagePath) {
    const isManageApiPath = pathname.startsWith("/api/manage");

    if (pathname === "/manage/login") {
      if (authed) {
        return NextResponse.redirect(buildRedirectUrl(request, "/manage"));
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/manage/login") || pathname.startsWith("/api/manage/logout")) {
      return NextResponse.next();
    }

    if (!authed) {
      if (isManageApiPath) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(buildRedirectUrl(request, "/manage/login"));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/leads")) {
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (pathname.startsWith("/api/admin/login") || pathname.startsWith("/api/admin/logout")) {
      return NextResponse.next();
    }

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    if (authed) {
      return NextResponse.redirect(buildRedirectUrl(request, "/admin"));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!authed) {
      return NextResponse.redirect(buildRedirectUrl(request, "/admin/login"));
    }
    return NextResponse.next();
  }

  if (pathname === "/leads") {
    if (!authed) {
      return NextResponse.redirect(buildRedirectUrl(request, "/admin/login"));
    }
    return NextResponse.redirect(buildRedirectUrl(request, "/admin"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/admin",
    "/manage/:path*",
    "/manage",
    "/leads",
    "/Venus",
    "/Venus/:path*",
    "/venus-overlay",
    "/venus-overlay/:path*",
    "/venus-login",
    "/api/leads/:path*",
    "/api/admin/:path*",
    "/api/manage/:path*",
    "/api/venus-auth/:path*",
    "/api/private-workspace/:path*",
    "/api/venus-overlay/:path*",
    "/api/venus-images/:path*",
    "/api/venus-local-media",
    "/api/venus-external-preview",
  ],
};
