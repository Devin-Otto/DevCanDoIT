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

console.log(`Building Venus from ${venusRoot} for /Venus hosting...`);
execSync("npm run build:web:website", {
  cwd: venusRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_VENUS_BACKGROUND_IMAGE_URL: "/api/venus-images/background",
    VITE_VENUS_CENTER_IMAGE_URL: "/api/venus-images/center",
    VITE_VENUS_PROFILE_IMAGE_URL: "/api/venus-images/profile"
  }
});

if (!fs.existsSync(path.join(venusDist, "index.html"))) {
  throw new Error(`Expected built Venus files in ${venusDist}.`);
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

console.log(`Synced Venus build into ${targetDir}.`);
console.log("Commit the updated public/Venus files in DevCanDoIT so Railway can deploy them.");
