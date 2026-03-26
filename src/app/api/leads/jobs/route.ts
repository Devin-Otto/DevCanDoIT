import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { listLeadScanJobs } from "@/lib/lead-finder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await listLeadScanJobs(10);
    return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load scan jobs." },
      { status: 500 },
    );
  }
}
