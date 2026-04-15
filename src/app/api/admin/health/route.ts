import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { loadLeadStore } from "@/lib/lead-finder";
import { getLeadWorkerHeartbeat } from "@/lib/lead-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await loadLeadStore();
    const worker = await getLeadWorkerHeartbeat();

    return NextResponse.json(
      {
        ok: true,
        database: "connected",
        worker: worker
          ? {
              status: worker.status,
              lastSeenAt: worker.lastSeenAt,
              currentJobId: worker.currentJobId,
              currentStep: worker.currentStep,
              note: worker.note,
            }
          : { status: "offline" },
        latestJob: store.job ?? null,
        recentJobs: store.recentJobs ?? [],
        totalLeads: store.leads.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/admin/health] Health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Health check failed.",
      },
      { status: 500 },
    );
  }
}
