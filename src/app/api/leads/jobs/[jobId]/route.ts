import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getLeadScanJob } from "@/lib/lead-finder";
import { loadLeadStoreSnapshot } from "@/lib/lead-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext<"/api/leads/jobs/[jobId]">) {
  try {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await context.params;
    const job = await getLeadScanJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const store = await loadLeadStoreSnapshot(jobId);
    return NextResponse.json({ job, store }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load scan job." },
      { status: 500 },
    );
  }
}
