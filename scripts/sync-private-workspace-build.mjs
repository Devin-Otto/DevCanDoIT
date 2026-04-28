import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDir, "..");
const venusRoot = process.env.VENUS_REPO_PATH
  ? path.resolve(process.env.VENUS_REPO_PATH)
  : path.resolve(websiteRoot, "../Venus");
const venusDist = path.join(venusRoot, "dist");
const targetDir = path.join(websiteRoot, "public", "Venus");
const companionSpriteSourceDir = path.join(venusRoot, "sprites");
const companionSpriteTargetDir = path.join(websiteRoot, "public", "venus-companions", "sprites");
const EXCLUDED_PUBLIC_VENUS_FILES = new Set([
  "favicon-32.png",
  "favicon-192.png",
  "favicon-512.png",
  "space-hero.jpg",
  "venus-center-default.jpeg",
  "venus-portrait.jpg"
]);

if (!fs.existsSync(path.join(venusRoot, "package.json"))) {
  throw new Error(`Could not find the private Venus repo at ${venusRoot}. Set VENUS_REPO_PATH if needed.`);
}

console.log(`Building hosted workspace app from ${venusRoot} for /Venus hosting...`);
execSync("npm run build:web:website", {
  cwd: venusRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_HOSTED_APP_MODE: "remote-only",
    VITE_HOSTED_BACKGROUND_IMAGE_URL: "/api/private-workspace/images/background",
    VITE_HOSTED_CENTER_IMAGE_URL: "/api/private-workspace/images/center",
    VITE_HOSTED_EXTERNAL_PREVIEW_PATH: "/api/private-workspace/preview/external",
    VITE_HOSTED_LOCAL_MEDIA_PATH: "/api/private-workspace/media/local",
    VITE_HOSTED_PROFILE_IMAGE_URL: "/api/private-workspace/images/profile",
    VITE_HOSTED_SYNC_AUTH_PATH: "/api/private-workspace/sync/auth",
    VITE_HOSTED_SYNC_STATE_PATH: "/api/private-workspace/sync/state"
  }
});

if (!fs.existsSync(path.join(venusDist, "index.html"))) {
  throw new Error(`Expected built workspace files in ${venusDist}.`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.cpSync(venusDist, targetDir, {
  recursive: true,
  filter(source) {
    const relativePath = path.relative(venusDist, source);
    if (!relativePath) {
      return true;
    }

    return !EXCLUDED_PUBLIC_VENUS_FILES.has(relativePath.replace(/\\/gu, "/"));
  }
});

if (fs.existsSync(companionSpriteSourceDir)) {
  fs.rmSync(companionSpriteTargetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(companionSpriteTargetDir), { recursive: true });
  fs.cpSync(companionSpriteSourceDir, companionSpriteTargetDir, { recursive: true });
}

console.log(`Synced hosted workspace build into ${targetDir}.`);
console.log(`Synced companion sprite sheets into ${companionSpriteTargetDir}.`);
console.log("Commit the updated public/Venus files in DevCanDoIT so Railway can deploy them.");
