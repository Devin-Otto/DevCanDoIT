import { NextRequest, NextResponse } from "next/server";

import { isCompanionTriggerType } from "@/lib/venus-companions";
import { appendCompanionTrigger } from "@/lib/venus-companions.server";
import { isVenusAuthorizedRequest } from "@/lib/venus-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveTriggerSource(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.trim() ? "desktop" : "website";
}

export async function POST(request: NextRequest) {
  if (!(await isVenusAuthorizedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    note?: unknown;
    trigger?: unknown;
  };

  if (!isCompanionTriggerType(payload.trigger)) {
    return NextResponse.json({ error: "Invalid trigger." }, { status: 400 });
  }

  const trigger = await appendCompanionTrigger({
    note: typeof payload.note === "string" ? payload.note : undefined,
    source: resolveTriggerSource(request),
    trigger: payload.trigger
  });

  if (!trigger) {
    return NextResponse.json({ ok: false, reason: "inactive-session" });
  }

  return NextResponse.json({ ok: true, trigger });
}
