import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDir, "..");
const beatboundRoot = process.env.TELEMIDI_REPO_PATH
  ? path.resolve(process.env.TELEMIDI_REPO_PATH)
  : path.resolve(websiteRoot, "../BeatBound");
const manifestPath = path.join(beatboundRoot, "telemidi.project.json");

if (!fs.existsSync(path.join(beatboundRoot, "package.json"))) {
  throw new Error(`Could not find the private BeatBound repo at ${beatboundRoot}. Set TELEMIDI_REPO_PATH if needed.`);
}

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Could not find TeleMIDI manifest at ${manifestPath}.`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const buildOutput = path.join(beatboundRoot, manifest.buildOutput);
const targetDir = path.join(websiteRoot, manifest.publicOutput);

console.log(`Exporting TeleMIDI from ${beatboundRoot} for ${manifest.basePath} hosting...`);
execSync(manifest.syncCommand, {
  cwd: beatboundRoot,
  stdio: "inherit",
  env: process.env,
});

if (!fs.existsSync(path.join(buildOutput, "index.html"))) {
  throw new Error(`Expected exported TeleMIDI files in ${buildOutput}.`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.cpSync(buildOutput, targetDir, { recursive: true });

console.log(`Synced TeleMIDI build into ${targetDir}.`);
console.log("Commit the updated public/telemidi-connect files in DevCanDoIT so Railway can deploy them.");
