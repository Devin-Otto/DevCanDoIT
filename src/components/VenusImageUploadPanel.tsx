"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CloudUpload, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";

type VenusImageSlot = "background" | "center" | "profile";

type UploadResult = {
  status: "failed" | "uploaded" | "uploading";
  message: string;
};

type VenusImageMeta = {
  exists: boolean;
  fileName: string;
  sizeBytes: number | null;
  slot: VenusImageSlot;
  source: "placeholder" | "volume";
  updatedAt: string | null;
};

interface VenusImageUploadPanelProps {
  assetRoot: string;
}

const SLOT_DETAILS: Array<{
  description: string;
  label: string;
  slot: VenusImageSlot;
}> = [
  {
    description: "Used for the main artwork card in the protected app.",
    label: "Center image",
    slot: "center"
  },
  {
    description: "Used for the small portrait in the top-right corner of the protected app.",
    label: "Profile image",
    slot: "profile"
  },
  {
    description: "Used when the protected app switches to the uploaded background photo mode.",
    label: "Background image",
    slot: "background"
  }
];

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

export function VenusImageUploadPanel({ assetRoot }: VenusImageUploadPanelProps) {
  const [imageMeta, setImageMeta] = useState<Partial<Record<VenusImageSlot, VenusImageMeta>>>({});
  const [previewVersions, setPreviewVersions] = useState<Record<VenusImageSlot, number>>({
    background: Date.now(),
    center: Date.now(),
    profile: Date.now()
  });
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<VenusImageSlot, File | null>>>({});
  const [statusMessages, setStatusMessages] = useState<Record<VenusImageSlot, string>>({
    background: "Ready to upload.",
    center: "Ready to upload.",
    profile: "Ready to upload."
  });
  const [results, setResults] = useState<Partial<Record<VenusImageSlot, UploadResult>>>({});
  const [loadingSlots, setLoadingSlots] = useState<Partial<Record<VenusImageSlot, boolean>>>({});

  async function refreshSlot(slot: VenusImageSlot) {
    const response = await fetch(`/api/manage/venus-images/${slot}`, {
      headers: {
        Accept: "application/json"
      }
    });

    const payload = (await response.json()) as {
      error?: string;
      image?: VenusImageMeta;
    };

    if (!response.ok || !payload.image) {
      throw new Error(payload.error || `Unable to refresh the ${slot} image.`);
    }

    setImageMeta((current) => ({
      ...current,
      [slot]: payload.image
    }));
  }

  useEffect(() => {
    for (const { slot } of SLOT_DETAILS) {
      void refreshSlot(slot).catch(() => {
        // The public Venus image route returns a placeholder preview even before an upload exists.
      });
    }
  }, []);

  const previewSources = useMemo(
    () =>
      Object.fromEntries(
        SLOT_DETAILS.map(({ slot }) => [slot, `/api/venus-images/${slot}?v=${previewVersions[slot]}`])
      ) as Record<VenusImageSlot, string>,
    [previewVersions]
  );

  async function handleUpload(slot: VenusImageSlot) {
    const selectedFile = selectedFiles[slot];
    if (!selectedFile) {
      setStatusMessages((current) => ({
        ...current,
        [slot]: "Choose an image first."
      }));
      return;
    }

    setLoadingSlots((current) => ({ ...current, [slot]: true }));
    setResults((current) => ({
      ...current,
      [slot]: { status: "uploading", message: "Streaming to volume..." }
    }));
    setStatusMessages((current) => ({
      ...current,
      [slot]: `Uploading ${selectedFile.name} to ${assetRoot}...`
    }));

    try {
      const response = await fetch(`/api/manage/venus-images/${slot}`, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
          "X-Photo-Filename": encodeURIComponent(selectedFile.name)
        },
        body: selectedFile
      });

      const payload = (await response.json().catch(() => ({}))) as {
        bytesWritten?: number;
        error?: string;
        fileName?: string;
        ok?: boolean;
      };

      if (!response.ok || !payload.ok) {
        const message = payload.error || "Upload failed.";
        setResults((current) => ({
          ...current,
          [slot]: { status: "failed", message }
        }));
        setStatusMessages((current) => ({
          ...current,
          [slot]: message
        }));
        return;
      }

      setResults((current) => ({
        ...current,
        [slot]: {
          status: "uploaded",
          message: `${payload.fileName || selectedFile.name} · ${formatBytes(payload.bytesWritten ?? null)}`
        }
      }));
      setPreviewVersions((current) => ({
        ...current,
        [slot]: Date.now()
      }));
      setSelectedFiles((current) => ({
        ...current,
        [slot]: null
      }));
      await refreshSlot(slot);
      setStatusMessages((current) => ({
        ...current,
        [slot]: `${SLOT_DETAILS.find((item) => item.slot === slot)?.label || "Image"} updated.`
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload image.";
      setResults((current) => ({
        ...current,
        [slot]: { status: "failed", message }
      }));
      setStatusMessages((current) => ({
        ...current,
        [slot]: message
      }));
    } finally {
      setLoadingSlots((current) => ({ ...current, [slot]: false }));
    }
  }

  return (
    <section className="surface-card profile-photo-panel">
      <div className="profile-photo-header">
        <div>
          <p className="eyebrow">Protected app images</p>
          <h2>Upload the private images used by the protected app build.</h2>
          <p className="muted">
            These files live in the site storage volume and are served through <code>/api/venus-images/[slot]</code>,
            so the public repository does not need to carry the raw photos.
          </p>
        </div>

        <div className="profile-photo-meta">
          <div className="lead-summary-stat">
            <span className="lead-summary-label">Asset root</span>
            <strong>{assetRoot}</strong>
          </div>
          <div className="lead-summary-stat">
            <span className="lead-summary-label">Slots</span>
            <strong>{SLOT_DETAILS.length} managed uploads</strong>
          </div>
        </div>
      </div>

      <div className="profile-photo-layout venus-image-grid">
        {SLOT_DETAILS.map(({ description, label, slot }) => {
          const image = imageMeta[slot];
          const loading = Boolean(loadingSlots[slot]);
          const selectedFile = selectedFiles[slot];
          const result = results[slot];

          return (
            <article key={slot} className="profile-photo-actions venus-image-card">
              <div className="profile-photo-preview">
                <div className={`profile-photo-preview-image venus-image-preview venus-image-preview--${slot}`}>
                  <Image src={previewSources[slot]} alt={`${label} preview`} fill sizes="(max-width: 900px) 100vw, 420px" />
                </div>
                <div className="profile-photo-preview-copy">
                  <span>{label}</span>
                  <small>{image?.source === "volume" ? image.fileName : "Placeholder preview"}</small>
                </div>
              </div>

              <p className="muted">{description}</p>

              <label className="video-upload-dropzone profile-photo-dropzone">
                <input
                  type="file"
                  accept="image/*,.jpeg,.jpg,.png,.webp,.avif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFiles((current) => ({
                      ...current,
                      [slot]: file
                    }));
                    setStatusMessages((current) => ({
                      ...current,
                      [slot]: file ? `${file.name} selected.` : "Ready to upload."
                    }));
                    setResults((current) => ({
                      ...current,
                      [slot]: undefined
                    }));
                  }}
                />
                <CloudUpload className="size-6" />
                <strong>Choose image</strong>
                <span>JPEG, PNG, WebP, or AVIF. The filename is normalized per image slot.</span>
              </label>

              <div className="button-row">
                <button className="button" type="button" onClick={() => void handleUpload(slot)} disabled={loading || !selectedFile}>
                  {loading ? <LoaderCircle className="icon-spin" /> : <Sparkles className="size-4" />}
                  {loading ? "Uploading..." : "Upload image"}
                </button>

                <button
                  className="button button-ghost"
                  type="button"
                  onClick={async () => {
                    setLoadingSlots((current) => ({ ...current, [slot]: true }));
                    try {
                      await refreshSlot(slot);
                      setPreviewVersions((current) => ({
                        ...current,
                        [slot]: Date.now()
                      }));
                      setStatusMessages((current) => ({
                        ...current,
                        [slot]: `${label} refreshed.`
                      }));
                    } catch (error) {
                      setStatusMessages((current) => ({
                        ...current,
                        [slot]: error instanceof Error ? error.message : `Unable to refresh ${label.toLowerCase()}.`
                      }));
                    } finally {
                      setLoadingSlots((current) => ({ ...current, [slot]: false }));
                    }
                  }}
                >
                  <RefreshCw className="size-4" />
                  Refresh
                </button>
              </div>

              <div className="profile-photo-status">
                <span>{statusMessages[slot]}</span>
                {result ? (
                  <p className={`form-state ${result.status === "uploaded" ? "success" : result.status === "failed" ? "error" : ""}`}>
                    {result.message}
                  </p>
                ) : null}
              </div>

              <div className="profile-photo-details">
                <div>
                  <span className="lead-summary-label">Uploaded file</span>
                  <strong>{image?.source === "volume" ? image.fileName : "Using placeholder"}</strong>
                </div>
                <div>
                  <span className="lead-summary-label">Size</span>
                  <strong>{formatBytes(image?.sizeBytes ?? null)}</strong>
                </div>
                <div>
                  <span className="lead-summary-label">Updated</span>
                  <strong>{image?.updatedAt ? new Date(image.updatedAt).toLocaleString() : "Not uploaded yet"}</strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
