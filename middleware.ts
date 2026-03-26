import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isPublicSiteOnly } from "@/lib/runtime-flags";

async function isAuthed(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await isAuthed(request);
  const isApiPath = pathname.startsWith("/api/");
  const isInternalPath =
    pathname.startsWith("/admin") ||
    pathname === "/leads" ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/api/leads") ||
    pathname.startsWith("/api/admin");
  const isManagePath = pathname.startsWith("/manage") || pathname.startsWith("/api/manage");

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
        return NextResponse.redirect(new URL("/manage", request.url));
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

      return NextResponse.redirect(new URL("/manage/login", request.url));
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
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!authed) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/leads") {
    if (!authed) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.redirect(new URL("/admin", request.url));
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
    "/api/leads/:path*",
    "/api/admin/:path*",
    "/api/manage/:path*",
  ],
};
