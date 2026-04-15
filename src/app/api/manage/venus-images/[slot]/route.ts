import { statSync } from "fs";
import { mkdir, rename, rm } from "fs/promises";

import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
import {
  PayloadTooLargeError,
  RequestInputError,
  streamRequestBodyToFile,
  VENUS_IMAGE_MAX_BYTES
} from "@/lib/upload-stream.server";
import {
  getVenusImageAssetRoot,
  isVenusImageSlot,
  removeExistingVenusImageVariants,
  resolveVenusImagePath,
  sanitizeVenusImageFileName
} from "@/lib/venus-images.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthed(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

function getSlot(context: RouteContext<"/api/manage/venus-images/[slot]">) {
  return context.params.then(({ slot }) => {
    if (!isVenusImageSlot(slot)) {
      throw new RequestInputError("Unknown Venus image slot.");
    }

    return slot;
  });
}

function getFileNameFromHeader(request: NextRequest, slot: Awaited<ReturnType<typeof getSlot>>) {
  const encoded = request.headers.get("x-photo-filename");
  if (!encoded) {
    throw new RequestInputError("Missing photo file name header.");
  }

  try {
    return sanitizeVenusImageFileName(slot, decodeURIComponent(encoded));
  } catch {
    throw new RequestInputError("Invalid photo file name.");
  }
}

function getContentType(fileName: string) {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request: NextRequest, context: RouteContext<"/api/manage/venus-images/[slot]">) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const slot = await getSlot(context);
    const image = resolveVenusImagePath(slot);

    return NextResponse.json({
      assetRoot: getVenusImageAssetRoot(),
      image: {
        exists: image.exists,
        fileName: image.fileName,
        sizeBytes: image.sizeBytes,
        slot,
        source: image.source,
        updatedAt: image.updatedAt
      }
    });
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[manage/venus-images] Metadata lookup failed", error);
    return NextResponse.json({ error: "Unable to load Venus image right now." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/manage/venus-images/[slot]">) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await isAuthed(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = assertRateLimit(request, "manage-venus-images", { limit: 40, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }

    const slot = await getSlot(context);
    const fileName = getFileNameFromHeader(request, slot);
    const targetPath = `${getVenusImageAssetRoot()}/${fileName}`;
    const tempPath = `${targetPath}.${Date.now()}.uploading`;

    await mkdir(getVenusImageAssetRoot(), { recursive: true });

    try {
      await streamRequestBodyToFile(request, tempPath, VENUS_IMAGE_MAX_BYTES);
      removeExistingVenusImageVariants(slot);
      await rename(tempPath, targetPath);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }

    const stats = statSync(targetPath);

    return NextResponse.json({
      bytesWritten: stats.size,
      contentType: getContentType(fileName),
      fileName,
      ok: true,
      slot,
      targetPath
    });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof RequestInputError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[manage/venus-images] Upload failed", error);
    return NextResponse.json({ error: "Unable to upload file right now." }, { status: 500 });
  }
}
