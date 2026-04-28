import { loadVenusSyncDocument } from "@/lib/venus-sync.server";

import { VenusLiveOverlayClient } from "./VenusLiveOverlayClient";

export const dynamic = "force-dynamic";

export default async function VenusLiveOverlayPage() {
  const document = await loadVenusSyncDocument();
  const initialOverlay = {
    ...document.liveOverlay,
    updatedAt: document.liveOverlay.updatedAt || document.updatedAt
  };

  return <VenusLiveOverlayClient initialOverlay={initialOverlay} initialOverlayStyles={document.preferences?.overlayStyles} panel="goal" />;
}
