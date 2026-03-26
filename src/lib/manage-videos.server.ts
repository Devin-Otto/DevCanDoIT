import { getVideoStorageSummary, listManagedVideos as listManagedVideoFiles } from "@/lib/video-storage.server";
import type { ManagedVideoFile } from "@/lib/video-types";

export function getManagedVideoAssetRoot() {
  return getVideoStorageSummary().label;
}

export function getManagedVideoStorageSummary() {
  return getVideoStorageSummary();
}

export async function listManagedVideos(): Promise<ManagedVideoFile[]> {
  return listManagedVideoFiles();
}
