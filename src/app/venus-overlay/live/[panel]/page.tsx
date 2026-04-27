import { notFound } from "next/navigation";

import { type OverlayPanel, VenusLiveOverlayClient } from "../VenusLiveOverlayClient";

export const dynamic = "force-dynamic";

const VALID_PANELS = new Set<OverlayPanel>(["all", "coins", "daily-hearts", "followers", "goal", "likes"]);

export default async function VenusLiveOverlayPanelPage({
  params
}: {
  params: Promise<{ panel: string }>;
}) {
  const { panel } = await params;

  if (!VALID_PANELS.has(panel as OverlayPanel)) {
    notFound();
  }

  return <VenusLiveOverlayClient panel={panel as OverlayPanel} />;
}
