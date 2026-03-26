import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isPublicSiteOnly } from "@/lib/runtime-flags";

export const dynamic = "force-dynamic";

export default async function LeadsRedirectPage() {
  if (isPublicSiteOnly) {
    notFound();
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!(await verifyAdminSessionToken(session))) {
    redirect("/admin/login");
  }

  redirect("/admin");
}
