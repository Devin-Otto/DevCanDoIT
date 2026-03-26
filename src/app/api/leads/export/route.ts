import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { exportLeadsCsv, loadLeadStore } from "@/lib/lead-finder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await loadLeadStore();
    const csv = exportLeadsCsv(store.leads);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="devcandoit-leads.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to export leads." }, { status: 500 });
  }
}
