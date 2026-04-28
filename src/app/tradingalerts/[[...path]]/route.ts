import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { forwardTradingAlertsRequest } from "@/lib/trading-alerts-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TradingAlertsProxyRouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

async function unauthorizedTradingAlertsResponse(request: NextRequest) {
  const wantsJson = request.nextUrl.pathname.startsWith("/tradingalerts/api") || request.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.nextUrl.origin);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

async function proxyTradingAlerts(request: NextRequest, context: TradingAlertsProxyRouteContext) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminSessionToken(token))) {
    return unauthorizedTradingAlertsResponse(request);
  }

  const { path } = await context.params;
  return forwardTradingAlertsRequest({ pathSegments: path, request });
}

export async function GET(request: NextRequest, context: TradingAlertsProxyRouteContext) {
  return proxyTradingAlerts(request, context);
}

export async function HEAD(request: NextRequest, context: TradingAlertsProxyRouteContext) {
  return proxyTradingAlerts(request, context);
}

export async function POST(request: NextRequest, context: TradingAlertsProxyRouteContext) {
  return proxyTradingAlerts(request, context);
}

export async function PUT(request: NextRequest, context: TradingAlertsProxyRouteContext) {
  return proxyTradingAlerts(request, context);
}

export async function PATCH(request: NextRequest, context: TradingAlertsProxyRouteContext) {
  return proxyTradingAlerts(request, context);
}

export async function DELETE(request: NextRequest, context: TradingAlertsProxyRouteContext) {
  return proxyTradingAlerts(request, context);
}
