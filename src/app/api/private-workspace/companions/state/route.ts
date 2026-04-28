import { NextRequest, NextResponse } from "next/server";

import { getCompanionRemoteState } from "@/lib/venus-companions.server";
import { isVenusAuthorizedRequest } from "@/lib/venus-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isVenusAuthorizedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  return NextResponse.json(await getCompanionRemoteState(cursor));
}
