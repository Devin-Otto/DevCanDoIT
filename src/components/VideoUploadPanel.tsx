"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  CloudUpload,
  FileVideo,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import type { ManagedVideoFile } from "@/lib/video-types";

type UploadResult = {
  fileName: string;
  status: "queued" | "uploading" | "uploaded" | "failed";
  message: string;
  progress: number | null;
};

interface VideoUploadPanelProps {
  initialVideos: ManagedVideoFile[];
  assetRoot: string;
}

const BIG_FILE_WARNING_BYTES = 95 * 1024 * 1024;

function formatBytes(bytes: number | null) {
  if (bytes === null) {
    return "Not uploaded";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function VideoUploadPanel({ initialVideos, assetRoot }: VideoUploadPanelProps) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [message, setMessage] = useState("Ready to upload.");
  const [loading, setLoading] = useState(false);

  const videoCount = useMemo(() => videos.length, [videos.length]);
  const uploadedCount = useMemo(() => videos.filter((video) => video.exists).length, [videos]);
  const hasOversizedFiles = useMemo(
    () => selectedFiles.some((file) => file.size >= BIG_FILE_WARNING_BYTES),
    [selectedFiles]
  );

  const refreshInventory = async () => {
    const response = await fetch("/api/manage/videos", {
      headers: {
        Accept: "application/json",
      },
    });

    const payload = (await response.json()) as { videos?: ManagedVideoFile[]; error?: string };

    if (!response.ok || !payload.videos) {
      throw new Error(payload.error || "Unable to refresh video inventory.");
    }

    setVideos(payload.videos);
  };

  const uploadVideoFile = (file: File, onProgress: (progress: number | null) => void) =>
    new Promise<{
      ok?: boolean;
      error?: string;
      fileName?: string;
      bytesWritten?: number;
    }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("POST", "/api/manage/videos");
      xhr.responseType = "text";
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
          return;
        }

        onProgress(null);
      };
      xhr.onload = () => {
        let payload: {
          ok?: boolean;
          error?: string;
          fileName?: string;
          bytesWritten?: number;
        } = {};

        try {
          payload = JSON.parse(xhr.responseText) as typeof payload;
        } catch {
          // ignore parse issues and fall through to the status check below
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(payload.error || `Upload failed with status ${xhr.status}.`));
          return;
        }

        resolve(payload);
      };
      xhr.onerror = () => {
        reject(new Error("Unable to upload video."));
      };
      xhr.onabort = () => {
        reject(new Error("Upload canceled."));
      };
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("X-Video-Filename", encodeURIComponent(file.name));
      xhr.send(file);
    });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage("Choose one or more video files first.");
      return;
    }

    setLoading(true);
    setMessage(`Uploading ${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} to ${assetRoot}...`);
    setResults(
      selectedFiles.map((file) => ({
        fileName: file.name,
        status: "queued",
        message: "Waiting...",
        progress: 0,
      }))
    );

    const nextResults: UploadResult[] = [];

    try {
      for (const [index, file] of selectedFiles.entries()) {
        nextResults.push({ fileName: file.name, status: "uploading", message: "Streaming to volume...", progress: 0 });
        setResults([...nextResults]);

        const updateCurrentResult = (patch: Partial<UploadResult>) => {
          const current = nextResults[index];
          nextResults[index] = {
            ...current,
            ...patch,
          };
          setResults([...nextResults]);
        };

        try {
          const payload = await uploadVideoFile(file, (progress) => {
            updateCurrentResult({
              message:
                progress === null ? "Streaming to volume..." : `${progress}% uploaded · ${formatBytes(file.size)}`,
              progress,
            });
            setMessage(
              progress === null
                ? `Uploading ${file.name}...`
                : `${file.name}: ${progress}% uploaded (${formatBytes(file.size)})`
            );
          });

          if (!payload.ok) {
            updateCurrentResult({
              status: "failed",
              message: payload.error || "Upload failed.",
              progress: null,
            });
            continue;
          }

          updateCurrentResult({
            fileName: payload.fileName || file.name,
            status: "uploaded",
            message: payload.bytesWritten ? `${formatBytes(payload.bytesWritten)} written` : "Uploaded.",
            progress: 100,
          });
        } catch (error) {
          updateCurrentResult({
            status: "failed",
            message: error instanceof Error ? error.message : "Unable to upload video.",
            progress: null,
          });
          setMessage(error instanceof Error ? error.message : "Unable to upload videos.");
          continue;
        }
      }

      await refreshInventory();
      setMessage("Upload complete.");
      setSelectedFiles([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload videos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="surface-card video-upload-panel">
      <div className="video-upload-header">
        <div>
          <p className="eyebrow">Railway volume</p>
          <h2>Upload videos into {assetRoot}</h2>
          <p className="muted">
            Select one or more files. The uploader streams each file directly to the mounted volume and preserves the
            exact file name.
          </p>
          {hasOversizedFiles ? (
            <p className="video-upload-warning">
              One or more selected files are larger than about 95 MB. If a file stalls through the proxied domain,
              try a smaller export or tell me and I’ll move the upload path off the proxy.
            </p>
          ) : null}
        </div>

        <div className="video-upload-stats">
          <div className="lead-summary-stat">
            <span className="lead-summary-label">Expected</span>
            <strong>{videoCount}</strong>
          </div>
          <div className="lead-summary-stat">
            <span className="lead-summary-label">Present</span>
            <strong>{uploadedCount}</strong>
          </div>
        </div>

        <div className="video-upload-actions">
          <button
            className="button button-ghost"
            type="button"
            onClick={async () => {
              await fetch("/api/manage/logout", { method: "POST" });
              router.replace("/manage/login");
              router.refresh();
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="video-upload-hero">
        <label className="video-upload-dropzone">
          <input
            type="file"
            accept=".mp4,.m4v,.mov,video/*"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              setSelectedFiles(files);
              setMessage(files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected.` : "Ready to upload.");
              setResults([]);
            }}
          />
          <CloudUpload className="size-6" />
          <strong>Choose video files</strong>
          <span>Drag and drop is supported by the browser file picker, or click to select files.</span>
        </label>

        <div className="video-upload-actions">
          <button className="button" type="button" onClick={handleUpload} disabled={loading || selectedFiles.length === 0}>
            {loading ? <LoaderCircle className="icon-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Uploading..." : "Upload selected"}
          </button>

          <button
            className="button button-ghost"
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await refreshInventory();
                setMessage("Inventory refreshed.");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Unable to refresh inventory.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <RefreshCw className="size-4" />
            Refresh list
          </button>
        </div>
      </div>

      <div className="video-upload-note">
        <p>
          Exact filename matching matters for the current carousel. If you want the existing videos to show up
          immediately, rename your local files to match the target names in the list below before uploading.
        </p>
      </div>

      <div className="video-selection-list">
        <div className="video-selection-header">
          <span>Selected files</span>
          <span>{selectedFiles.length} chosen</span>
        </div>
        {selectedFiles.length > 0 ? (
          <ul>
            {selectedFiles.map((file) => (
              <li key={file.name}>
                <FileVideo className="size-4" />
                <span>{file.name}</span>
                <small>{formatBytes(file.size)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No files selected yet.</p>
        )}
      </div>

      <div className="video-upload-status">
        <div className="video-upload-status-header">
          <span>Upload log</span>
          <span>{message}</span>
        </div>

        {results.length > 0 ? (
          <ul className="video-upload-log">
            {results.map((result) => (
              <li key={`${result.fileName}-${result.status}`}>
                <div className="video-upload-log-icon">
                  {result.status === "uploaded" ? (
                    <CheckCircle2 className="size-4 video-upload-ok" />
                  ) : result.status === "failed" ? (
                    <Circle className="size-4 video-upload-fail" />
                  ) : (
                    <LoaderCircle className="size-4 icon-spin" />
                  )}
                </div>

                <div className="video-upload-log-copy">
                  <strong>{result.fileName}</strong>
                  <span>{result.message}</span>
                  {result.status === "uploading" ? (
                    <div className="video-upload-progress" aria-hidden="true">
                      <span style={{ width: `${result.progress ?? 10}%` }} />
                    </div>
                  ) : null}
                </div>

                <small>{result.progress === null ? "" : result.status === "uploading" ? `${result.progress}%` : ""}</small>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="video-library">
        <div className="video-library-header">
          <span>Expected files</span>
          <span>Status is based on the Railway volume contents.</span>
        </div>

        <ul className="video-library-list">
          {videos.map((video) => (
            <li key={video.slug} className={video.exists ? "present" : "missing"}>
              <div>
                <strong>{video.title}</strong>
                <p>{video.fileName}</p>
              </div>
              <div className="video-library-meta">
                <span>{video.exists ? "Present" : "Missing"}</span>
                <span>{formatBytes(video.sizeBytes)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
