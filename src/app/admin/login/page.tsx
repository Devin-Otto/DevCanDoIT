import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isPublicSiteOnly } from "@/lib/runtime-flags";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Private sign-in for the DevCanDoIt command center.",
};

export const dynamic = "force-dynamic";

interface AdminLoginPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

function getSafeNextPath(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  if (isPublicSiteOnly) {
    notFound();
  }

  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (await verifyAdminSessionToken(session)) {
    redirect(nextPath);
  }

  return (
    <main className="site-shell page-stack auth-page">
      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Private login</p>
          <h1>Sign in to the command center.</h1>
          <p>Access is limited to the admin workspace for maintaining the site and leads.</p>
        </div>

        <aside className="surface-card quote-card">
          <p className="eyebrow">Access</p>
          <h2>Hidden from the public nav.</h2>
          <p className="muted">
            This is intentionally tucked into the footer so it stays out of the way of the public site experience.
          </p>
        </aside>
      </section>

      <section className="lead-form-wrap">
        <AdminLoginForm redirectTo={nextPath} />
      </section>
    </main>
  );
}
