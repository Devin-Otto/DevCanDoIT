import { NextRequest, NextResponse } from "next/server";

import { assertRateLimit } from "@/lib/request-security";
import { assertTileOSPublicProxyConfigured, forwardTileOSPublicJson, isValidTileOSDraftId } from "@/lib/tileos-public-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext<"/api/tileos/public/drafts/[draftId]">) {
  const { draftId } = await context.params;
  if (!isValidTileOSDraftId(draftId)) {
    return NextResponse.json({ error: "Invalid draft id." }, { status: 400 });
  }

  const rateLimit = await assertRateLimit(request, "tileos-public-get-draft", {
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many draft checks. Try again later." }, { status: 429 });
  }

  assertTileOSPublicProxyConfigured();

  return forwardTileOSPublicJson({
    method: "GET",
    request,
    upstreamPath: `/api/public/drafts/${draftId}`,
  });
}
