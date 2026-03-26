import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Manage Login",
  description: "Private sign-in for the DevCanDoIt media manager.",
};

export const dynamic = "force-dynamic";

export default async function ManageLoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (await verifyAdminSessionToken(session)) {
    redirect("/manage");
  }

  return (
    <main className="site-shell page-stack auth-page">
      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Private media manager</p>
          <h1>Sign in to upload videos.</h1>
          <p>Use this workspace to place the raw video files into the Railway volume.</p>
        </div>

        <aside className="surface-card quote-card">
          <p className="eyebrow">Access</p>
          <h2>Hidden from the public nav.</h2>
          <p className="muted">This route is private and is intended only for managing uploaded media assets.</p>
        </aside>
      </section>

      <section className="lead-form-wrap">
        <AdminLoginForm
          apiPath="/api/manage/login"
          redirectTo="/manage"
          initialMessage="Private media access only."
        />
      </section>
    </main>
  );
}

