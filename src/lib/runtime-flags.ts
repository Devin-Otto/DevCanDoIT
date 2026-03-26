const publicSiteOnlyFlag = process.env.NEXT_PUBLIC_PUBLIC_SITE_ONLY?.trim().toLowerCase();

export const isPublicSiteOnly =
  publicSiteOnlyFlag === "true" || (typeof publicSiteOnlyFlag !== "string" && process.env.NODE_ENV === "production");
