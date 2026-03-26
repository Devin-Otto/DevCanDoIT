#!/usr/bin/env node

import { access, readFile, writeFile } from "fs/promises";
import { constants } from "fs";
import { randomBytes, scryptSync } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(rootDir, ".env.example");
const outputPath = path.join(rootDir, ".env.local");

const parsedArgs = parseArgs(process.argv.slice(2));

const templateText = await readFile(templatePath, "utf8");
const template = parseEnvText(templateText);
let existing = new Map();

try {
  await access(outputPath, constants.F_OK);
  const existingText = await readFile(outputPath, "utf8");
  existing = parseEnvText(existingText).values;
} catch {
  // No local env yet, which is fine.
}

const resolved = new Map(existing);

const username = resolveUsername({
  existing,
  force: parsedArgs.force,
  username: parsedArgs.username,
});
resolved.set("ADMIN_USERNAME", username);

const encryptionKey = pickSecretValue("LEAD_ENCRYPTION_KEY", { existing, force: parsedArgs.force });
resolved.set("LEAD_ENCRYPTION_KEY", encryptionKey);

const sessionSecret = pickSecretValue("ADMIN_SESSION_SECRET", { existing, force: parsedArgs.force });
resolved.set("ADMIN_SESSION_SECRET", sessionSecret);

const passwordSalt = pickSecretValue("ADMIN_PASSWORD_SALT", { existing, force: parsedArgs.force });
resolved.set("ADMIN_PASSWORD_SALT", passwordSalt);

const passwordEntry = resolvePassword({
  existing,
  force: parsedArgs.force,
  password: parsedArgs.password,
  salt: passwordSalt,
});
resolved.set("ADMIN_PASSWORD_HASH", passwordEntry.hash);

for (const [key, value] of template.values) {
  if (resolved.has(key)) {
    continue;
  }

  resolved.set(key, value);
}

const outputLines = [];
for (const line of template.lines) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) {
    outputLines.push(line);
    continue;
  }

  const [, key] = match;
  const value = resolved.get(key);
  if (typeof value === "undefined") {
    outputLines.push(line);
    continue;
  }

  outputLines.push(`${key}=${value}`);
  resolved.delete(key);
}

for (const [key, value] of resolved.entries()) {
  outputLines.push(`${key}=${value}`);
}

await writeFile(outputPath, `${outputLines.join("\n")}\n`, "utf8");

console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
console.log(`Admin username: ${username}`);
if (passwordEntry.generated) {
  console.log(`Generated admin password: ${passwordEntry.password}`);
  console.log("Keep that password somewhere safe. You can regenerate the hash later with this script.");
}
console.log("Done. Copy any remaining placeholders from .env.example if needed.");

function parseArgs(argv) {
  const result = {
    force: false,
    username: undefined,
    password: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      result.force = true;
      continue;
    }

    if (arg === "--username") {
      result.username = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg.startsWith("--username=")) {
      result.username = arg.slice("--username=".length);
      continue;
    }

    if (arg === "--password") {
      result.password = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg.startsWith("--password=")) {
      result.password = arg.slice("--password=".length);
    }
  }

  return result;
}

function parseEnvText(text) {
  const lines = text.split(/\r?\n/);
  const values = new Map();

  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    values.set(key, value);
  }

  return { lines, values };
}

function isPlaceholder(value) {
  if (typeof value !== "string") {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    normalized.startsWith("replace-with") ||
    normalized.startsWith("your-") ||
    normalized.startsWith("fill-in-") ||
    normalized.includes("placeholder")
  );
}

function resolveUsername({ existing, force, username }) {
  if (typeof username === "string" && username.trim().length > 0) {
    return username.trim();
  }

  const current = existing.get("ADMIN_USERNAME");
  if (!force && typeof current === "string" && !isPlaceholder(current)) {
    return current;
  }

  return "Devin";
}

function pickSecretValue(key, { existing, force }) {
  const current = existing.get(key);
  if (!force && typeof current === "string" && !isPlaceholder(current)) {
    return current;
  }

  return randomBytes(32).toString("base64url");
}

function resolvePassword({ existing, force, password, salt }) {
  const currentHash = existing.get("ADMIN_PASSWORD_HASH");
  const currentSalt = existing.get("ADMIN_PASSWORD_SALT");

  if (
    typeof password !== "string" &&
    !force &&
    typeof currentHash === "string" &&
    !isPlaceholder(currentHash) &&
    typeof currentSalt === "string" &&
    !isPlaceholder(currentSalt)
  ) {
    return {
      generated: false,
      password: "",
      hash: currentHash,
    };
  }

  const chosenPassword =
    typeof password === "string" && password.length > 0
      ? password
      : randomBytes(12).toString("base64url");
  const chosenSalt =
    force || typeof currentSalt !== "string" || isPlaceholder(currentSalt) ? salt : currentSalt;
  const hash = scryptSync(chosenPassword, chosenSalt, 64).toString("hex");

  return {
    generated: typeof password !== "string" || password.length === 0,
    password: chosenPassword,
    hash,
  };
}
