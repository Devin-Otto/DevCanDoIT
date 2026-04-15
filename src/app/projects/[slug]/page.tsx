import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppProjectDetailView } from "@/components/AppProjectDetailView";
import { getAppProject } from "@/lib/site";

type ProjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
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
  const project = getAppProject(slug);

  if (!project) {
    notFound();
  }

  return <AppProjectDetailView project={project} />;
}
