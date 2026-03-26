import { createReadStream } from "fs";
import { extname } from "path";
import { Readable } from "stream";

import { resolveProfilePhotoPath } from "@/lib/profile-photo.server";

export const dynamic = "force-dynamic";

function getContentType(fileName: string) {
  switch (extname(fileName).toLowerCase()) {
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

export async function GET() {
  const photo = resolveProfilePhotoPath();
  const stream = createReadStream(photo.filePath);

  return new Response(Readable.toWeb(stream) as unknown as BodyInit, {
    headers: {
      "Content-Type": getContentType(photo.fileName),
      "Cache-Control": "no-store",
    },
  });
}

