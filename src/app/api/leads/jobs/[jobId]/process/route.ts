import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: RouteContext<"/api/leads/jobs/[jobId]/process">) {
  const { jobId } = await context.params;
  return NextResponse.json(
    {
      error: `Scan job ${jobId} is processed by the background worker.`,
    },
    { status: 410 },
  );
}
