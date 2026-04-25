import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { serverErrorJson } from "@/lib/api-errors";
import { getLeadById, listLeadActivities, updateLeadRecord } from "@/lib/lead-db";
import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext<"/api/leads/[id]">) {
  try {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const lead = await getLeadById(id);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const activities = await listLeadActivities(id, 25);

    return NextResponse.json(
      { lead, activities },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return serverErrorJson({
      error,
      fallbackMessage: "Unable to load lead details.",
      route: "leads/[id]:GET",
    });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/leads/[id]">) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await assertRateLimit(request, "lead-update", { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many updates. Slow down a bit." }, { status: 429 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const hasContacted = typeof body.contacted === "boolean";
    const hasNotes = typeof body.notes === "string";
    const hasWebsite = typeof body.website === "string";
    const hasEmail = typeof body.email === "string";
    const hasPhone = typeof body.phone === "string";

    if (!hasContacted && !hasNotes && !hasWebsite && !hasEmail && !hasPhone) {
      return NextResponse.json(
        { error: "Provide contacted, notes, website, email, or phone to update a lead." },
        { status: 400 },
      );
    }

    const lead = await getLeadById(id);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const nextStore = await updateLeadRecord(id, {
      ...(hasContacted ? { contacted: body.contacted as boolean } : {}),
      ...(hasNotes ? { notes: (body.notes as string).trim() } : {}),
      ...(hasWebsite ? { website: (body.website as string).trim() || null } : {}),
      ...(hasEmail ? { email: (body.email as string).trim() || null } : {}),
      ...(hasPhone ? { phone: (body.phone as string).trim() || null } : {}),
    });

    return NextResponse.json({ store: nextStore }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return serverErrorJson({
      error,
      fallbackMessage: "Unable to update lead.",
      route: "leads/[id]:PATCH",
    });
  }
}
