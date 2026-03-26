import { createWriteStream, statSync } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";
import {
  getProfilePhotoAssetRoot,
  removeExistingProfilePhotoVariants,
  resolveProfilePhotoPath,
  sanitizeProfilePhotoFileName,
} from "@/lib/profile-photo.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthed(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

function getFileNameFromHeader(request: NextRequest) {
  const encoded = request.headers.get("x-photo-filename");
  if (!encoded) {
    throw new Error("Missing photo file name header.");
  }

  try {
    return sanitizeProfilePhotoFileName(decodeURIComponent(encoded));
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

export async function GET(request: NextRequest) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photo = resolveProfilePhotoPath();

  return NextResponse.json({
    assetRoot: getProfilePhotoAssetRoot(),
    photo: {
      fileName: photo.fileName,
      exists: photo.exists,
      source: photo.source,
      sizeBytes: photo.sizeBytes,
      updatedAt: photo.updatedAt,
      src: "/api/profile-photo",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await isAuthed(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = assertRateLimit(request, "manage-profile-photo", { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }

    const fileName = getFileNameFromHeader(request);
    const targetPath = `${getProfilePhotoAssetRoot()}/${fileName}`;
    const tempPath = `${targetPath}.${Date.now()}.uploading`;

    await mkdir(getProfilePhotoAssetRoot(), { recursive: true });

    if (!request.body) {
      return NextResponse.json({ error: "Missing upload body." }, { status: 400 });
    }

    const readable = Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]);
    const writable = createWriteStream(tempPath, { flags: "w" });

    try {
      await pipeline(readable, writable);
      removeExistingProfilePhotoVariants();
      await rename(tempPath, targetPath);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }

    const stats = statSync(targetPath);

    return NextResponse.json({
      ok: true,
      fileName,
      targetPath,
      bytesWritten: stats.size,
      contentType: getContentType(fileName),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
