import { rmSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const nextDist = path.join(projectRoot, ".next");
const defaultPort = 7261;
const tsxBinary = path.join(projectRoot, "node_modules", ".bin", "tsx");

function collectPortPids(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return output
      .split("\n")
      .map((value) => Number(value.trim()))
      .filter((pid) => Number.isFinite(pid) && pid > 0);
  } catch {
    return [];
  }
}

function stopProcesses(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The process may already be gone by the time we get here.
    }
  }
}

function collectProjectNextPids() {
  try {
    const output = execSync("ps -axo pid=,command=", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return output
      .split("\n")
      .filter(
        (line) =>
          line.includes(projectRoot) &&
          (line.includes("next dev") || line.includes("lead-worker.ts") || line.includes("worker:leads")),
      )
      .map((line) => Number(line.trim().split(/\s+/, 1)[0]))
      .filter((pid) => Number.isFinite(pid) && pid > 0);
  } catch {
    return [];
  }
}

const occupiedPids = [...new Set([
  ...collectPortPids(3000),
  ...collectPortPids(3001),
  ...collectPortPids(defaultPort),
  ...collectProjectNextPids()
])];
stopProcesses(occupiedPids);

rmSync(nextDist, { recursive: true, force: true });

const nextChild = spawn("next", ["dev"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: process.env.PORT || String(defaultPort)
  },
  stdio: "inherit"
});

const workerChild = spawn(tsxBinary, ["scripts/lead-worker.ts"], {
  cwd: projectRoot,
  env: {
    ...process.env
  },
  stdio: "inherit"
});

const children = [nextChild, workerChild];

function stopChildren(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

const forwardSignal = (signal) => {
  stopChildren(signal);
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

let exited = false;
for (const child of children) {
  child.on("exit", (code, signal) => {
    if (exited) {
      return;
    }

    exited = true;
    stopChildren(signal ?? "SIGTERM");

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

workerChild.on("error", (error) => {
  console.error("[dev-clean] worker failed to start:", error);
});
