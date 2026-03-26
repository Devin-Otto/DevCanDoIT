import { setTimeout as sleep } from "timers/promises";

import { ensureLeadDatabase, setLeadWorkerHeartbeat, updateLeadScanJob } from "@/lib/lead-db";
import { listLeadScanJobs, processLeadScanJob } from "@/lib/lead-finder";

const IDLE_DELAY_MS = 2500;
const BATCH_TIME_BUDGET_MS = 6000;
const BATCH_SIZE = 8;

let shuttingDown = false;

function pickNextJob(jobs: Awaited<ReturnType<typeof listLeadScanJobs>>) {
  const pending = jobs
    .filter((job) => job.status === "queued" || job.status === "running")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return pending[0] ?? null;
}

async function updateHeartbeat(args: {
  status: string;
  currentJobId?: string | null;
  currentStep?: string | null;
  note?: string | null;
}) {
  await setLeadWorkerHeartbeat({
    status: args.status,
    currentJobId: args.currentJobId ?? null,
    currentStep: args.currentStep ?? null,
    note: args.note ?? null,
  });
}

async function processLoop() {
  await ensureLeadDatabase();
  console.log("[lead-worker] ready");

  while (!shuttingDown) {
    try {
      await updateHeartbeat({
        status: "idle",
        currentStep: "polling queue",
        note: "Waiting for queued lead scans.",
      });

      const jobs = await listLeadScanJobs(20);
      const nextJob = pickNextJob(jobs);

      if (!nextJob) {
        await sleep(IDLE_DELAY_MS);
        continue;
      }

      await updateHeartbeat({
        status: "running",
        currentJobId: nextJob.id,
        currentStep: `processing ${nextJob.processedCandidates}/${nextJob.totalCandidates}`,
        note: nextJob.status === "queued" ? "Picked up queued scan job." : "Resuming in-progress scan job.",
      });

      if (nextJob.status === "queued") {
        await updateLeadScanJob(nextJob.id, {
          status: "running",
          startedAt: nextJob.startedAt ?? new Date().toISOString(),
        });
      }

      const result = await processLeadScanJob(nextJob.id, {
        deadlineAt: Date.now() + BATCH_TIME_BUDGET_MS,
        batchSize: nextJob.batchSize ?? BATCH_SIZE,
        maxBatches: 1,
      });

      await updateHeartbeat({
        status: result.job.status === "completed" ? "idle" : "running",
        currentJobId: result.job.status === "completed" ? null : result.job.id,
        currentStep:
          result.job.status === "completed"
            ? "idle"
            : `processing ${result.job.processedCandidates}/${result.job.totalCandidates}`,
        note:
          result.job.status === "completed"
            ? "Latest lead scan completed."
            : result.job.partial
              ? "Lead scan paused with partial results; continuing on the next pass."
              : "Lead scan still running.",
      });

      if (result.job.status !== "completed" && result.job.status !== "failed") {
        await sleep(250);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lead worker encountered an error.";
      console.error("[lead-worker]", message);

      await updateHeartbeat({
        status: "error",
        currentStep: "worker error",
        note: message,
      });

      const jobs = await listLeadScanJobs(1);
      const active = pickNextJob(jobs);
      if (active) {
        await updateLeadScanJob(active.id, {
          status: "failed",
          completedAt: new Date().toISOString(),
          failureReason: message,
        });
      }

      await sleep(1000);
    }
  }

  await updateHeartbeat({
    status: "offline",
    currentStep: "stopped",
    note: "Lead worker shut down.",
  });
}

function stopWorker(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[lead-worker] received ${signal}, shutting down...`);
}

process.on("SIGINT", () => stopWorker("SIGINT"));
process.on("SIGTERM", () => stopWorker("SIGTERM"));

processLoop().catch((error) => {
  console.error("[lead-worker] fatal", error);
  process.exitCode = 1;
});
