import { NextRequest, NextResponse } from "next/server";

import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
import {
  createTelemidiSession,
  describeTelemidiTokenVerificationFailure,
  sanitizeDisplayName,
  verifyTelemidiIdToken,
} from "@/lib/telemidi-session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rateLimit = assertRateLimit(request, "telemidi-session-create", {
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      const retryAfterSeconds = Math.max(1, Math.ceil(((rateLimit.retryAt ?? Date.now()) - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many session attempts. Try again shortly." },
        {
          headers: {
            "Retry-After": retryAfterSeconds.toString(),
          },
          status: 429,
        },
      );
    }

    const idToken = getBearerToken(request);
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await verifyTelemidiIdToken(idToken);
    } catch (error) {
      const failure = describeTelemidiTokenVerificationFailure(error);
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }
    const body = (await request.json().catch(() => null)) as { displayName?: unknown } | null;
    const displayName = sanitizeDisplayName(body?.displayName, "Host");
    const session = await createTelemidiSession({
      displayName,
      uid: decodedToken.uid,
    });

    return NextResponse.json({
      joinCode: session.joinCode,
      role: "host",
      sessionId: session.sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a TeleMIDI session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
