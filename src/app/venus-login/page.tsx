import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { VENUS_COOKIE_NAME, isVenusGateConfigured, verifyVenusSessionToken } from "@/lib/venus-auth";

export const metadata: Metadata = {
  title: "Private Access",
  description: "Private sign-in for a protected workspace."
};

export const dynamic = "force-dynamic";

interface VenusLoginPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

export default async function VenusLoginPage({ searchParams }: VenusLoginPageProps) {
  const cookieStore = await cookies();
  const session = cookieStore.get(VENUS_COOKIE_NAME)?.value;
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/Venus";

  if (!isVenusGateConfigured()) {
    redirect("/Venus");
  }

  if (await verifyVenusSessionToken(session)) {
    redirect(nextPath);
  }

  return (
    <main className="site-shell page-stack auth-page">
      <section className="page-hero">
        <div className="section-copy section-intro">
          <p className="eyebrow">Private access</p>
          <h1>Enter the shared password to continue.</h1>
          <p>This gate protects the private workspace without exposing credentials in the public repository.</p>
        </div>

        <aside className="surface-card quote-card">
          <p className="eyebrow">Protected area</p>
          <h2>Only the invited viewer should have access.</h2>
          <p className="muted">Once signed in, the browser keeps the session active so the protected app and its uploaded images load normally.</p>
        </aside>
      </section>

      <section className="lead-form-wrap">
        <AdminLoginForm
          apiPath="/api/venus-auth/login"
          initialMessage="Private access only."
          initialUsername=""
          redirectTo={nextPath}
          submitLabel="Continue"
        />
      </section>
    </main>
  );
}
