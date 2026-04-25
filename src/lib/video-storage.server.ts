import { randomUUID } from "crypto";
import { existsSync, statSync } from "fs";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { validateUploadedBuffer } from "@/lib/file-validation";
import { videoShowcase } from "@/lib/site";
import { RequestInputError, VIDEO_UPLOAD_MAX_BYTES } from "@/lib/upload-stream.server";
import { getVideoAssetRoot, resolveVideoAssetPath } from "@/lib/video-assets";
import { getVideoContentType, sanitizeUploadedVideoFileName } from "@/lib/video-files.server";
import type { ManagedVideoFile } from "@/lib/video-types";

type VideoBucketConfig = {
  accessKeyId: string;
  bucketName: string;
  endpoint: string;
  forcePathStyle: boolean;
  publicBaseUrl: string | null;
  region: string;
  secretAccessKey: string;
};

type VideoStorageSummary = {
  bucketName: string | null;
  description: string;
  label: string;
  mode: "filesystem" | "bucket";
  publicBaseUrl: string | null;
  root: string;
};

type ManagedVideoUploadTarget = {
  contentType: string;
  fileName: string;
  objectKey: string;
  pendingExpiresAt: string;
  publicUrl: string | null;
  storageLabel: string;
  storageMode: "bucket";
  uploadUrl: string;
};

type CompletedManagedVideoUpload = {
  bytesWritten: number;
  contentType: string;
  fileName: string;
  publicUrl: string | null;
};

const PENDING_UPLOAD_PREFIX = "pending/";
const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

let cachedBucketConfig: VideoBucketConfig | null | undefined;
let cachedS3Client: S3Client | null = null;

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function parseBooleanEnv(name: string, defaultValue: boolean) {
  const value = getOptionalEnv(name);
  if (value === null) {
    return defaultValue;
  }

  return !["false", "0", "no", "off"].includes(value.toLowerCase());
}

export function getVideoBucketConfig() {
  if (cachedBucketConfig !== undefined) {
    return cachedBucketConfig;
  }

  const bucketName = getOptionalEnv("VIDEO_BUCKET_NAME");
  const region = getOptionalEnv("VIDEO_BUCKET_REGION");
  const endpoint = getOptionalEnv("VIDEO_BUCKET_ENDPOINT");
  const accessKeyId = getOptionalEnv("VIDEO_BUCKET_ACCESS_KEY_ID");
  const secretAccessKey = getOptionalEnv("VIDEO_BUCKET_SECRET_ACCESS_KEY");

  if (!bucketName || !region || !endpoint || !accessKeyId || !secretAccessKey) {
    cachedBucketConfig = null;
    return null;
  }

  cachedBucketConfig = {
    accessKeyId,
    bucketName,
    endpoint,
    forcePathStyle: parseBooleanEnv("VIDEO_BUCKET_FORCE_PATH_STYLE", true),
    publicBaseUrl: getOptionalEnv("VIDEO_BUCKET_PUBLIC_BASE_URL"),
    region,
    secretAccessKey,
  };

  return cachedBucketConfig;
}

export function getVideoStorageSummary(): VideoStorageSummary {
  const bucketConfig = getVideoBucketConfig();

  if (bucketConfig) {
    return {
      bucketName: bucketConfig.bucketName,
      description: "S3-compatible bucket",
      label: `bucket://${bucketConfig.bucketName}`,
      mode: "bucket",
      publicBaseUrl: bucketConfig.publicBaseUrl,
      root: `bucket://${bucketConfig.bucketName}`,
    };
  }

  const root = getVideoAssetRoot();
  return {
    bucketName: null,
    description: "Railway volume",
    label: root,
    mode: "filesystem",
    publicBaseUrl: null,
    root,
  };
}

function getS3Client() {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const config = getVideoBucketConfig();
  if (!config) {
    throw new Error("Video bucket storage is not configured.");
  }

  cachedS3Client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  });

  return cachedS3Client;
}

function getContentType(fileName: string) {
  return getVideoContentType(fileName);
}

function getBucketObjectUrl(fileName: string) {
  const config = getVideoBucketConfig();
  if (!config?.publicBaseUrl) {
    return null;
  }

  const baseUrl = config.publicBaseUrl.endsWith("/") ? config.publicBaseUrl : `${config.publicBaseUrl}/`;
  return new URL(encodeURIComponent(fileName), baseUrl).toString();
}

function isMissingObjectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  const status = maybeError.$metadata?.httpStatusCode;
  return (
    status === 404 ||
    maybeError.name === "NotFound" ||
    maybeError.name === "NoSuchKey" ||
    maybeError.Code === "NotFound" ||
    maybeError.Code === "NoSuchKey" ||
    maybeError.code === "NotFound" ||
    maybeError.code === "NoSuchKey"
  );
}

function buildPendingObjectKey(fileName: string) {
  return `${PENDING_UPLOAD_PREFIX}${Date.now()}-${randomUUID()}-${fileName}`;
}

function extractPendingUploadTimestamp(objectKey: string) {
  if (!objectKey.startsWith(PENDING_UPLOAD_PREFIX)) {
    return null;
  }

  const [timestampPart] = objectKey.slice(PENDING_UPLOAD_PREFIX.length).split("-", 1);
  const parsed = Number(timestampPart);
  return Number.isFinite(parsed) ? parsed : null;
}

function encodeCopySource(bucketName: string, objectKey: string) {
  return `${bucketName}/${objectKey.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

async function streamBodyToBuffer(body: GetObjectCommandOutput["Body"]) {
  if (!body) {
    return Buffer.alloc(0);
  }

  const withTransform = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof withTransform.transformToByteArray === "function") {
    return Buffer.from(await withTransform.transformToByteArray());
  }

  const readable = body as AsyncIterable<Uint8Array | Buffer | string>;
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function deleteBucketObject(objectKey: string) {
  const config = getVideoBucketConfig();
  if (!config) {
    return;
  }

  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: objectKey,
      }),
    );
  } catch (error) {
    if (!isMissingObjectError(error)) {
      throw error;
    }
  }
}

async function cleanupExpiredPendingUploads() {
  const config = getVideoBucketConfig();
  if (!config) {
    return;
  }

  const response = await getS3Client().send(
    new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 100,
      Prefix: PENDING_UPLOAD_PREFIX,
    }),
  );

  const now = Date.now();
  const expiredKeys = (response.Contents ?? [])
    .map((item) => item.Key)
    .filter((key): key is string => Boolean(key))
    .filter((key) => {
      const timestamp = extractPendingUploadTimestamp(key);
      return typeof timestamp === "number" && timestamp + PENDING_UPLOAD_TTL_MS <= now;
    });

  await Promise.all(expiredKeys.map((objectKey) => deleteBucketObject(objectKey)));
}

async function readBucketObjectLeadingBytes(objectKey: string) {
  const config = getVideoBucketConfig();
  if (!config) {
    throw new Error("Video bucket storage is not configured.");
  }

  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Range: "bytes=0-4095",
    }),
  );

  return streamBodyToBuffer(response.Body);
}

export async function listManagedVideos(): Promise<ManagedVideoFile[]> {
  const storage = getVideoStorageSummary();

  if (storage.mode === "filesystem") {
    return videoShowcase.map((item) => {
      const filePath = resolveVideoAssetPath(item.fileName);

      if (!existsSync(filePath)) {
        return {
          exists: false,
          fileName: item.fileName,
          sizeBytes: null,
          slug: item.slug,
          src: item.src,
          summary: item.summary,
          title: item.title,
          updatedAt: null,
        };
      }

      const stats = statSync(filePath);
      return {
        exists: true,
        fileName: item.fileName,
        sizeBytes: stats.size,
        slug: item.slug,
        src: item.src,
        summary: item.summary,
        title: item.title,
        updatedAt: stats.mtime.toISOString(),
      };
    });
  }

  const client = getS3Client();

  return Promise.all(
    videoShowcase.map(async (item) => {
      try {
        const head = await client.send(
          new HeadObjectCommand({
            Bucket: getVideoBucketConfig()!.bucketName,
            Key: item.fileName,
          }),
        );

        return {
          exists: true,
          fileName: item.fileName,
          sizeBytes: Number(head.ContentLength ?? 0),
          slug: item.slug,
          src: item.src,
          summary: item.summary,
          title: item.title,
          updatedAt: head.LastModified?.toISOString() ?? null,
        };
      } catch (error) {
        if (!isMissingObjectError(error)) {
          throw error;
        }

        return {
          exists: false,
          fileName: item.fileName,
          sizeBytes: null,
          slug: item.slug,
          src: item.src,
          summary: item.summary,
          title: item.title,
          updatedAt: null,
        };
      }
    }),
  );
}

export async function createManagedVideoUploadTarget(args: {
  fileName: string;
  contentType: string;
}): Promise<ManagedVideoUploadTarget> {
  const config = getVideoBucketConfig();
  if (!config) {
    throw new Error("Video bucket storage is not configured.");
  }

  await cleanupExpiredPendingUploads();

  const sanitizedFileName = sanitizeUploadedVideoFileName(args.fileName);
  const objectKey = buildPendingObjectKey(sanitizedFileName);
  const contentType = getContentType(sanitizedFileName);
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    ContentType: contentType,
    Key: objectKey,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 30 });

  return {
    contentType,
    fileName: sanitizedFileName,
    objectKey,
    pendingExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    publicUrl: getBucketObjectUrl(sanitizedFileName),
    storageLabel: `bucket://${config.bucketName}`,
    storageMode: "bucket",
    uploadUrl,
  };
}

export async function completeManagedVideoUpload(args: {
  fileName: string;
  objectKey: string;
}): Promise<CompletedManagedVideoUpload> {
  const config = getVideoBucketConfig();
  if (!config) {
    throw new Error("Video bucket storage is not configured.");
  }

  const fileName = sanitizeUploadedVideoFileName(args.fileName);
  if (!args.objectKey.startsWith(PENDING_UPLOAD_PREFIX) || !args.objectKey.endsWith(`-${fileName}`)) {
    throw new RequestInputError("Invalid pending upload reference.");
  }

  const client = getS3Client();
  const objectInfo = await client.send(
    new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: args.objectKey,
    }),
  );

  const sizeBytes = Number(objectInfo.ContentLength ?? 0);
  if (sizeBytes <= 0) {
    await deleteBucketObject(args.objectKey);
    throw new RequestInputError("Uploaded video is empty.");
  }

  if (sizeBytes > VIDEO_UPLOAD_MAX_BYTES) {
    await deleteBucketObject(args.objectKey);
    throw new RequestInputError("Uploaded video exceeds the allowed size.", 413);
  }

  const signatureBuffer = await readBucketObjectLeadingBytes(args.objectKey);
  const validation = await validateUploadedBuffer({
    buffer: signatureBuffer,
    contentType: objectInfo.ContentType ?? getContentType(fileName),
    fileName,
    kind: "video",
  }).catch(async (error) => {
    await deleteBucketObject(args.objectKey);
    throw new RequestInputError(error instanceof Error ? error.message : "Unsupported video upload.");
  });

  await client.send(
    new CopyObjectCommand({
      Bucket: config.bucketName,
      ContentType: validation.contentType,
      CopySource: encodeCopySource(config.bucketName, args.objectKey),
      Key: fileName,
      MetadataDirective: "REPLACE",
    }),
  );

  await deleteBucketObject(args.objectKey);

  return {
    bytesWritten: sizeBytes,
    contentType: validation.contentType,
    fileName,
    publicUrl: getBucketObjectUrl(fileName),
  };
}

export async function getBucketObjectInfo(fileName: string) {
  const config = getVideoBucketConfig();
  if (!config) {
    throw new Error("Video bucket storage is not configured.");
  }

  const result = await getS3Client().send(
    new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: fileName,
    }),
  );

  return {
    contentType: result.ContentType ?? getContentType(fileName),
    sizeBytes: Number(result.ContentLength ?? 0),
    updatedAt: result.LastModified?.toISOString() ?? null,
  };
}

export async function streamBucketObject(args: {
  fileName: string;
  rangeHeader: string | null;
}) {
  const config = getVideoBucketConfig();
  if (!config) {
    throw new Error("Video bucket storage is not configured.");
  }

  const commandInput: ConstructorParameters<typeof GetObjectCommand>[0] = {
    Bucket: config.bucketName,
    Key: args.fileName,
  };

  if (args.rangeHeader) {
    commandInput.Range = args.rangeHeader;
  }

  const response = (await getS3Client().send(new GetObjectCommand(commandInput))) as GetObjectCommandOutput;
  return response;
}
