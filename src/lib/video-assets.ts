import path from "path";

export function getVideoAssetRoot() {
  return process.env.VIDEO_ASSET_ROOT?.trim() || "videos";
}

export function resolveVideoAssetPath(fileName: string) {
  const root = getVideoAssetRoot();
  if (path.isAbsolute(root)) {
    return path.join(root, fileName);
  }

  return path.join(process.cwd(), root, fileName);
}
