import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { assertAllowedOrigin } from "@/lib/request-security";
import { loadVenusSyncDocument, saveVenusSyncDocument } from "@/lib/venus-sync.server";
import {
  isVenusGateConfigured,
  VENUS_COOKIE_NAME,
  verifyVenusDesktopSyncToken,
  verifyVenusSessionToken
} from "@/lib/venus-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim() ?? "";
}

async function isAuthorized(request: NextRequest) {
  if (!isVenusGateConfigured()) {
    return false;
  }

  if (await verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return true;
  }

  if (await verifyVenusSessionToken(request.cookies.get(VENUS_COOKIE_NAME)?.value)) {
    return true;
  }

  return verifyVenusDesktopSyncToken(getBearerToken(request));
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await loadVenusSyncDocument());
}

export async function PUT(request: NextRequest) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await isAuthorized(request))) {
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
    const message = error instanceof Error ? error.message : "Unable to save sync state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
