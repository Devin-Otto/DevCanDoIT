import { createWriteStream } from "fs";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";

const BYTES_PER_MIB = 1024 * 1024;

export const PROFILE_PHOTO_MAX_BYTES = 10 * BYTES_PER_MIB;
export const VENUS_IMAGE_MAX_BYTES = 25 * BYTES_PER_MIB;
export const VIDEO_UPLOAD_MAX_BYTES = 150 * BYTES_PER_MIB;

export class RequestInputError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "RequestInputError";
    this.statusCode = statusCode;
  }
}

export class PayloadTooLargeError extends RequestInputError {
  constructor(message = "Upload exceeds the allowed size.") {
    super(message, 413);
    this.name = "PayloadTooLargeError";
  }
}

function parseContentLength(request: Request) {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function assertContentLengthWithinLimit(request: Request, maxBytes: number) {
  const contentLength = parseContentLength(request);
  if (contentLength != null && contentLength > maxBytes) {
    throw new PayloadTooLargeError();
  }
}

export async function streamRequestBodyToFile(request: Request, filePath: string, maxBytes: number) {
  if (!request.body) {
    throw new RequestInputError("Missing upload body.");
  }

  assertContentLengthWithinLimit(request, maxBytes);

  let bytesWritten = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytesWritten += chunk.length;
      if (bytesWritten > maxBytes) {
        callback(new PayloadTooLargeError());
        return;
      }
      callback(null, chunk);
    },
  });

  const readable = Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]);
  const writable = createWriteStream(filePath, { flags: "w" });

  await pipeline(readable, limiter, writable);
  return bytesWritten;
}
