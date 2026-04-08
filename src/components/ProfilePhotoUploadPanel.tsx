"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CloudUpload, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";

type UploadResult = {
  status: "queued" | "uploading" | "uploaded" | "failed";
  message: string;
};

interface ProfilePhotoUploadPanelProps {
  assetRoot: string;
}

type PhotoMeta = {
  fileName: string;
  exists: boolean;
  source: "volume" | "fallback" | "missing";
  sizeBytes: number | null;
  updatedAt: string | null;
};

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

export function ProfilePhotoUploadPanel({ assetRoot }: ProfilePhotoUploadPanelProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(() => Date.now());
  const [photoMeta, setPhotoMeta] = useState<PhotoMeta | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready to update the profile photo.");

  const previewSrc = useMemo(() => `/api/profile-photo?v=${previewVersion}`, [previewVersion]);

  const refreshPhoto = async () => {
    const response = await fetch("/api/manage/profile-photo", {
      headers: {
        Accept: "application/json",
      },
    });

    const payload = (await response.json()) as {
      photo?: PhotoMeta;
      error?: string;
    };

    if (!response.ok || !payload.photo) {
      throw new Error(payload.error || "Unable to refresh profile photo.");
    }

    setPhotoMeta(payload.photo);
  };

  useEffect(() => {
    void refreshPhoto().catch(() => {
      // The preview still works because the public route falls back to the generated placeholder.
    });
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage("Choose an image first.");
      return;
    }

    setLoading(true);
    setResult({ status: "uploading", message: "Streaming to volume..." });
    setStatusMessage(`Uploading ${selectedFile.name} to ${assetRoot}...`);

    try {
      const response = await fetch("/api/manage/profile-photo", {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
          "X-Photo-Filename": encodeURIComponent(selectedFile.name),
        },
        body: selectedFile,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fileName?: string;
        bytesWritten?: number;
      };

      if (!response.ok || !payload.ok) {
        const message = payload.error || "Upload failed.";
        setResult({ status: "failed", message });
        setStatusMessage(message);
        return;
      }

      setResult({
        status: "uploaded",
        message: `${payload.fileName || selectedFile.name} · ${formatBytes(payload.bytesWritten ?? null)}`,
      });
      setPreviewVersion(Date.now());
      await refreshPhoto();
      setSelectedFile(null);
      setStatusMessage("Profile photo updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload photo.";
      setResult({ status: "failed", message });
      setStatusMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="surface-card profile-photo-panel">
      <div className="profile-photo-header">
        <div>
          <p className="eyebrow">Profile photo</p>
          <h2>Update the portrait shown across the site.</h2>
          <p className="muted">
            This writes the new image into the Railway volume and serves it through <code>/api/profile-photo</code>.
          </p>
        </div>

        <div className="profile-photo-meta">
          <div className="lead-summary-stat">
            <span className="lead-summary-label">Asset root</span>
            <strong>{assetRoot}</strong>
          </div>
          <div className="lead-summary-stat">
            <span className="lead-summary-label">Status</span>
            <strong>{photoMeta?.source === "volume" ? "Present" : photoMeta?.source === "fallback" ? "Fallback" : "Missing"}</strong>
          </div>
        </div>
      </div>

      <div className="profile-photo-layout">
        <div className="profile-photo-preview">
          <div className="profile-photo-preview-image">
            <Image src={previewSrc} alt="Current profile photo" fill sizes="(max-width: 900px) 100vw, 520px" />
          </div>
          <div className="profile-photo-preview-copy">
            <span>Current preview</span>
            <small>{photoMeta?.source === "volume" ? photoMeta.fileName : "Placeholder preview"}</small>
          </div>
        </div>

        <div className="profile-photo-actions">
          <label className="video-upload-dropzone profile-photo-dropzone">
            <input
              type="file"
              accept="image/*,.jpeg,.jpg,.png,.webp,.avif"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setStatusMessage(file ? `${file.name} selected.` : "Ready to update the profile photo.");
                setResult(null);
              }}
            />
            <CloudUpload className="size-6" />
            <strong>Choose a photo</strong>
            <span>JPEG, PNG, WebP, or AVIF. The file name will be preserved on the volume.</span>
          </label>

          <div className="button-row">
            <button className="button" type="button" onClick={handleUpload} disabled={loading || !selectedFile}>
              {loading ? <LoaderCircle className="icon-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Uploading..." : "Upload photo"}
            </button>

            <button
              className="button button-ghost"
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  await refreshPhoto();
                  setPreviewVersion(Date.now());
                  setStatusMessage("Profile photo refreshed.");
                } catch (error) {
                  setStatusMessage(error instanceof Error ? error.message : "Unable to refresh photo.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>

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

          <div className="profile-photo-status">
            <span>{statusMessage}</span>
          {result ? (
              <p className={`form-state ${result.status === "uploaded" ? "success" : "error"}`}>{result.message}</p>
            ) : null}
          </div>

          <div className="profile-photo-details">
            <div>
              <span className="lead-summary-label">Uploaded photo</span>
              <strong>{photoMeta?.fileName ?? "No uploaded photo yet"}</strong>
            </div>
            <div>
              <span className="lead-summary-label">Size</span>
              <strong>{formatBytes(photoMeta?.sizeBytes ?? null)}</strong>
            </div>
            <div>
              <span className="lead-summary-label">Updated</span>
              <strong>{photoMeta?.updatedAt ? new Date(photoMeta.updatedAt).toLocaleString() : "Placeholder image"}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
