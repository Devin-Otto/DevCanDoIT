import { NextRequest, NextResponse } from "next/server";

import { loadVenusSyncDocument } from "@/lib/venus-sync.server";
import { isVenusAuthorizedRequest } from "@/lib/venus-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isVenusAuthorizedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await loadVenusSyncDocument();

  return NextResponse.json({
    liveOverlay: document.liveOverlay,
    revision: document.revision,
    updatedAt: document.liveOverlay.updatedAt || document.updatedAt
  });
}
