"use server";

import { requireRole } from "@/lib/auth-helpers";
import { findJob } from "@/lib/jobs";
import { runJob } from "@/lib/sync/run-job";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/**
 * Runs an automated job on demand from the CMS.
 *
 * Admin-only. These jobs write to every content collection on the site and spend a rate-limited
 * provider budget, so this is a narrower gate than the rest of the CMS — a moderator can edit an
 * article, but re-running the whole news pipeline is a different kind of decision.
 *
 * Note this deliberately runs the job *inline* rather than calling the cron route over HTTP. The
 * cron endpoints authenticate with `CRON_SECRET`, and having a browser-reachable action hold and
 * present that secret would turn a server-only credential into one more thing that can leak.
 * Calling `runJob` directly needs no secret at all.
 */
export type JobActionState = {
  ok: boolean;
  message: string;
  job: string | null;
};

export async function triggerJob(
  _previous: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const actor = await requireRole(["admin"]);
  const key = String(formData.get("job") ?? "");
  const job = findJob(key);

  if (!job) {
    return { ok: false, message: "That job doesn't exist.", job: null };
  }

  const outcome = await runJob(key, "manual", actor.name);

  await logAudit({
    actor,
    action: "update",
    entityType: "Automation",
    entityId: key,
    summary: `Ran "${job.name}" manually — ${outcome.ok ? "succeeded" : "failed"}: ${outcome.summary}`,
    before: null,
    after: { job: key, ok: outcome.ok, summary: outcome.summary, durationMs: outcome.durationMs },
  });

  // The dashboard shows the new "last run"; the job itself will have revalidated whatever
  // public pages its own writes touched.
  revalidatePath("/admin");

  return {
    ok: outcome.ok,
    message: outcome.summary,
    job: key,
  };
}
