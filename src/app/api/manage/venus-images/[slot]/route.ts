import { createWriteStream, statSync } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
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
      throw new Error("Unknown Venus image slot.");
    }

    return slot;
  });
}

function getFileNameFromHeader(request: NextRequest, slot: Awaited<ReturnType<typeof getSlot>>) {
  const encoded = request.headers.get("x-photo-filename");
  if (!encoded) {
    throw new Error("Missing photo file name header.");
  }

  try {
    return sanitizeVenusImageFileName(slot, decodeURIComponent(encoded));
  } catch {
    throw new Error("Invalid photo file name.");
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
    const message = error instanceof Error ? error.message : "Unable to load Venus image.";
    return NextResponse.json({ error: message }, { status: 400 });
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

    if (!request.body) {
      return NextResponse.json({ error: "Missing upload body." }, { status: 400 });
    }

    const readable = Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]);
    const writable = createWriteStream(tempPath, { flags: "w" });

    try {
      await pipeline(readable, writable);
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
    const message = error instanceof Error ? error.message : "Unable to upload file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
