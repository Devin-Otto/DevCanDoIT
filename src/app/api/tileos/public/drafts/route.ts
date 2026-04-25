import { NextRequest, NextResponse } from "next/server";

import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
import {
  assertTileOSPublicProxyConfigured,
  forwardTileOSPublicJson,
  parseTileOSDraftCreateBody,
  readTileOSPublicJsonBody,
} from "@/lib/tileos-public-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!assertAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = await assertRateLimit(request, "tileos-public-create-draft", {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many draft requests. Try again later." }, { status: 429 });
  }

  assertTileOSPublicProxyConfigured();

  try {
    const body = parseTileOSDraftCreateBody(await readTileOSPublicJsonBody(request));
    return forwardTileOSPublicJson({
      body,
      method: "POST",
      request,
      upstreamPath: "/api/public/drafts",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create a draft.",
      },
      { status: 400 },
    );
  }
}
