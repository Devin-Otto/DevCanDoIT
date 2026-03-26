import { existsSync, statSync } from "fs";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { videoShowcase } from "@/lib/site";
import { getVideoAssetRoot, resolveVideoAssetPath } from "@/lib/video-assets";
import { getVideoContentType, sanitizeUploadedVideoFileName } from "@/lib/video-files.server";
import type { ManagedVideoFile } from "@/lib/video-types";

type VideoBucketConfig = {
  bucketName: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
  forcePathStyle: boolean;
};

type VideoStorageSummary = {
  mode: "filesystem" | "bucket";
  label: string;
  description: string;
  root: string;
  bucketName: string | null;
  publicBaseUrl: string | null;
};

type ManagedVideoUploadTarget = {
  fileName: string;
  objectKey: string;
  uploadUrl: string;
  publicUrl: string | null;
  contentType: string;
  storageMode: "bucket";
  storageLabel: string;
};

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
    bucketName,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: getOptionalEnv("VIDEO_BUCKET_PUBLIC_BASE_URL"),
    forcePathStyle: parseBooleanEnv("VIDEO_BUCKET_FORCE_PATH_STYLE", true),
  };

  return cachedBucketConfig;
}

export function getVideoStorageSummary(): VideoStorageSummary {
  const bucketConfig = getVideoBucketConfig();

  if (bucketConfig) {
    return {
      mode: "bucket",
      label: `bucket://${bucketConfig.bucketName}`,
      description: "S3-compatible bucket",
      root: `bucket://${bucketConfig.bucketName}`,
      bucketName: bucketConfig.bucketName,
      publicBaseUrl: bucketConfig.publicBaseUrl,
    };
  }

  const root = getVideoAssetRoot();
  return {
    mode: "filesystem",
    label: root,
    description: "Railway volume",
    root,
    bucketName: null,
    publicBaseUrl: null,
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
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
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

export async function listManagedVideos(): Promise<ManagedVideoFile[]> {
  const storage = getVideoStorageSummary();

  if (storage.mode === "filesystem") {
    return videoShowcase.map((item) => {
      const filePath = resolveVideoAssetPath(item.fileName);

      if (!existsSync(filePath)) {
        return {
          slug: item.slug,
          title: item.title,
          summary: item.summary,
          fileName: item.fileName,
          src: item.src,
          exists: false,
          sizeBytes: null,
          updatedAt: null,
        };
      }

      const stats = statSync(filePath);
      return {
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        fileName: item.fileName,
        src: item.src,
        exists: true,
        sizeBytes: stats.size,
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
          slug: item.slug,
          title: item.title,
          summary: item.summary,
          fileName: item.fileName,
          src: item.src,
          exists: true,
          sizeBytes: Number(head.ContentLength ?? 0),
          updatedAt: head.LastModified?.toISOString() ?? null,
        };
      } catch (error) {
        if (!isMissingObjectError(error)) {
          throw error;
        }

        return {
          slug: item.slug,
          title: item.title,
          summary: item.summary,
          fileName: item.fileName,
          src: item.src,
          exists: false,
          sizeBytes: null,
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

  const sanitizedFileName = sanitizeUploadedVideoFileName(args.fileName);
  const contentType = args.contentType.trim() || getContentType(sanitizedFileName);
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: sanitizedFileName,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 30 });
  const publicUrl = getBucketObjectUrl(sanitizedFileName);

  return {
    fileName: sanitizedFileName,
    objectKey: sanitizedFileName,
    uploadUrl,
    publicUrl,
    contentType,
    storageMode: "bucket",
    storageLabel: `bucket://${config.bucketName}`,
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
    sizeBytes: Number(result.ContentLength ?? 0),
    updatedAt: result.LastModified?.toISOString() ?? null,
    contentType: result.ContentType ?? getContentType(fileName),
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
