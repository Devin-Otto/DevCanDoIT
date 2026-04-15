import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppProjectDetailView } from "@/components/AppProjectDetailView";
import { getAppProject } from "@/lib/site";

type ProjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "tileos") {
    return {
      title: "TileOS",
      description:
        "TileOS is the live public portfolio lab inside DevCanDoIt, where visitors can generate app drafts and explore the curated showcase."
    };
  }
  const project = getAppProject(slug);

  if (!project) {
    return {
      title: "Project not found"
    };
  }

  return {
    title: project.title,
    description: project.summary
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  if (slug === "tileos") {
    redirect("/tileos");
  }
  const project = getAppProject(slug);

  if (!project) {
    notFound();
  }

  return <AppProjectDetailView project={project} />;
}
