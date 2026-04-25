import { createReadStream } from "fs";
import { extname } from "path";
import { Readable } from "stream";

import { NextRequest, NextResponse } from "next/server";

import { isVenusImageSlot, resolveVenusImagePath } from "@/lib/venus-images.server";
import { isVenusAuthorizedRequest } from "@/lib/venus-access";

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
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request: NextRequest, context: RouteContext<"/api/venus-images/[slot]">) {
  if (!(await isVenusAuthorizedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slot } = await context.params;

  if (!isVenusImageSlot(slot)) {
    return new Response("Image not found", { status: 404 });
  }

  const image = resolveVenusImagePath(slot);

  if (image.filePath) {
    const stream = createReadStream(image.filePath);
    return new Response(Readable.toWeb(stream) as unknown as BodyInit, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": getContentType(image.fileName)
      }
    });
  }

  return new Response(image.svgFallback ?? "", {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/svg+xml"
    }
  });
}
