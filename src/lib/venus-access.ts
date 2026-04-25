import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  isVenusGateConfigured,
  VENUS_COOKIE_NAME,
  verifyVenusDesktopSyncToken,
  verifyVenusSessionToken,
} from "@/lib/venus-auth";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim() ?? "";
}

export async function isVenusAuthorizedRequest(request: NextRequest) {
  if (!isVenusGateConfigured()) {
    return false;
  }

  if (await verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return true;
  }

  if (await verifyVenusSessionToken(request.cookies.get(VENUS_COOKIE_NAME)?.value)) {
    return true;
  }

  return verifyVenusDesktopSyncToken(getBearerToken(request));
}
