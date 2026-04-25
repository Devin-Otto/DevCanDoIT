import { NextRequest, NextResponse } from "next/server";

import { serverErrorJson } from "@/lib/api-errors";
import { assertAllowedOrigin } from "@/lib/request-security";
import { loadVenusSyncDocument, saveVenusSyncDocument } from "@/lib/venus-sync.server";
import { isVenusAuthorizedRequest } from "@/lib/venus-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isVenusAuthorizedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await loadVenusSyncDocument());
}

export async function PUT(request: NextRequest) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await isVenusAuthorizedRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await loadVenusSyncDocument();
    const body = (await request.json().catch(() => null)) as { revision?: unknown } | null;
    const baseRevision = typeof body?.revision === "number" ? body.revision : -1;

    if (baseRevision !== current.revision) {
      return NextResponse.json(
        {
          current,
          error: "Sync revision conflict. Pull the latest state and retry."
        },
        { status: 409 }
      );
    }

    return NextResponse.json(await saveVenusSyncDocument(body, current.revision + 1));
  } catch (error) {
    return serverErrorJson({
      error,
      fallbackMessage: "Unable to save sync state.",
      route: "venus-sync/state",
    });
  }
}
