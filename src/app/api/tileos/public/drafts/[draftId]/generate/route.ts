import { NextRequest, NextResponse } from "next/server";

import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
import {
  assertTileOSPublicProxyConfigured,
  forwardTileOSPublicJson,
  isValidTileOSDraftId,
  parseTileOSDraftGenerateBody,
  readTileOSPublicJsonBody,
} from "@/lib/tileos-public-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: RouteContext<"/api/tileos/public/drafts/[draftId]/generate">) {
  if (!assertAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { draftId } = await context.params;
  if (!isValidTileOSDraftId(draftId)) {
    return NextResponse.json({ error: "Invalid draft id." }, { status: 400 });
  }

  const rateLimit = await assertRateLimit(request, "tileos-public-generate-draft", {
    limit: 15,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many generation requests. Try again later." }, { status: 429 });
  }

  assertTileOSPublicProxyConfigured();

  try {
    const body = parseTileOSDraftGenerateBody(await readTileOSPublicJsonBody(request));
    return forwardTileOSPublicJson({
      body,
      method: "POST",
      request,
      upstreamPath: `/api/public/drafts/${draftId}/generate`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate that draft.",
      },
      { status: 400 },
    );
  }
}
