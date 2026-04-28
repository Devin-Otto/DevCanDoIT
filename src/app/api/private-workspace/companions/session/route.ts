import { NextRequest, NextResponse } from "next/server";

import { type CompanionCharacterId, isCompanionCharacterId } from "@/lib/venus-companions";
import { getCompanionRemoteState, setCompanionSessionEnabled } from "@/lib/venus-companions.server";
import { isVenusAuthorizedRequest } from "@/lib/venus-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isVenusAuthorizedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    enabled?: boolean;
    enabledCharacterIds?: unknown[];
  };
  const enabledCharacterIds = Array.isArray(payload.enabledCharacterIds)
    ? payload.enabledCharacterIds.filter(isCompanionCharacterId)
    : undefined;

  await setCompanionSessionEnabled({
    enabled: Boolean(payload.enabled),
    enabledCharacterIds: enabledCharacterIds as CompanionCharacterId[] | undefined
  });

  return NextResponse.json(await getCompanionRemoteState());
}
