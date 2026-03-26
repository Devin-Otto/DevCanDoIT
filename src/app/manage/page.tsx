import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { StructuredData } from "@/components/StructuredData";
import { VideoUploadPanel } from "@/components/VideoUploadPanel";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { listManagedVideos, getManagedVideoAssetRoot } from "@/lib/manage-videos.server";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Manage Media",
  description: "Private media manager for uploading video assets to the Railway volume.",
};

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!(await verifyAdminSessionToken(session))) {
    redirect("/manage/login");
  }

  const initialVideos = listManagedVideos();
  const assetRoot = getManagedVideoAssetRoot();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${siteConfig.name} Media Manager`,
    description: "Private media uploader for the Railway volume.",
    url: `${siteConfig.siteUrl}/manage`,
  };

  return (
    <main className="site-shell page-stack manage-page">
      <StructuredData data={jsonLd} />

      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Private media manager</p>
          <h1>Upload the raw videos into the Railway volume.</h1>
          <p>
            Use this page to place the showcase files into <code>{assetRoot}</code> so the public video carousel can
            serve them.
          </p>
        </div>

        <aside className="surface-card quote-card">
          <p className="eyebrow">Instructions</p>
          <h2>Match the exact filenames.</h2>
          <p className="muted">
            The current site looks for the original filenames in the mounted volume. Rename your local files first if
            needed.
          </p>
        </aside>
      </section>

      <VideoUploadPanel initialVideos={initialVideos} assetRoot={assetRoot} />
    </main>
  );
}

