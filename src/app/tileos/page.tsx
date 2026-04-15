import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppProjectDetailView } from "@/components/AppProjectDetailView";
import { getAppProject } from "@/lib/site";

export const metadata: Metadata = {
  title: "TileOS",
  description:
    "TileOS is the live public portfolio lab inside DevCanDoIt, where visitors can generate app drafts and explore the curated showcase."
};

export default function TileOSPage() {
  const tileOSProject = getAppProject("tileos");

  if (!tileOSProject) {
    notFound();
  }

  return <AppProjectDetailView project={tileOSProject} hostedView />;
}
