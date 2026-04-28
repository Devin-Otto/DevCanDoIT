import { notFound } from "next/navigation";

import { type OverlayPanel } from "@/lib/venus-overlay-theme";
import { loadVenusSyncDocument } from "@/lib/venus-sync.server";
import { VenusLiveOverlayClient } from "../VenusLiveOverlayClient";

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

  const document = await loadVenusSyncDocument();
  const initialOverlay = {
    ...document.liveOverlay,
    updatedAt: document.liveOverlay.updatedAt || document.updatedAt
  };

  return (
    <VenusLiveOverlayClient
      initialOverlay={initialOverlay}
      initialOverlayStyles={document.preferences?.overlayStyles}
      panel={panel as OverlayPanel}
    />
  );
}
