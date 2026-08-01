import { dbConnect } from "@/lib/db";
import { SyncRun } from "@/lib/models/sync-run";
import { findJob, type JobResult } from "@/lib/jobs";

/**
 * Runs one automated job and records that it ran.
 *
 * The single execution path for both the Vercel crons and the CMS "Update" button, so a manual
 * run is never a different code path from the scheduled one — an editor pressing Update is
 * testing the real thing, not an approximation of it.
 *
 * A thrown job is caught and recorded as a failure rather than propagated. Losing the record of
 * a failed run is the worst outcome available here: the dashboard would show the last *good* run
 * as the most recent, making a job that has been dead for a day look healthy.
 */

export type JobRunOutcome = JobResult & {
  job: string;
  ranAt: Date;
  durationMs: number;
};

export async function runJob(
  key: string,
  trigger: "cron" | "manual",
  actorName: string | null = null,
): Promise<JobRunOutcome> {
  const job = findJob(key);

  if (!job) throw new Error(`Unknown automation job: ${key}`);

  const startedAt = Date.now();
  let result: JobResult;

  try {
    result = await job.run();
  } catch (error) {
    console.error(`Job "${key}" failed:`, error);
    result = {
      ok: false,
      // The message, not the stack: this string is rendered to an editor.
      summary: error instanceof Error ? error.message : "Failed with an unknown error.",
    };
  }

  const ranAt = new Date();
  const durationMs = Date.now() - startedAt;

  try {
    await dbConnect();
    await SyncRun.create({
      job: key,
      ranAt,
      trigger,
      ok: result.ok,
      summary: result.summary,
      actorName,
      durationMs,
    });
  } catch (error) {
    // Never fail a job because its bookkeeping failed — the work itself already happened.
    console.error(`Could not record the run of "${key}":`, error);
  }

  console.log(
    `[${trigger}] ${key}: ${result.ok ? "ok" : "FAILED"} in ${durationMs}ms — ${result.summary}`,
  );

  return { ...result, job: key, ranAt, durationMs };
}

export type LastRun = {
  ranAt: Date;
  trigger: "cron" | "manual";
  ok: boolean;
  summary: string;
  actorName: string | null;
};

/**
 * The most recent run of every job, keyed by job.
 *
 * One aggregation rather than a query per job — the dashboard renders the whole list at once,
 * and five round trips to show five rows would be wasteful on a page an editor opens constantly.
 */
export async function getLastRuns(): Promise<Map<string, LastRun>> {
  await dbConnect();

  const rows = await SyncRun.aggregate<{ _id: string; last: LastRun }>([
    { $sort: { ranAt: -1 } },
    {
      $group: {
        _id: "$job",
        last: {
          $first: {
            ranAt: "$ranAt",
            trigger: "$trigger",
            ok: "$ok",
            summary: "$summary",
            actorName: "$actorName",
          },
        },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id, row.last]));
}
