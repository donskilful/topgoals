"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { triggerJob, type JobActionState } from "@/lib/actions/jobs";

/**
 * The Update button, in its own component so `useFormStatus` can see the submission.
 *
 * `useFormStatus` reads from the nearest enclosing form, so it only works from a child of that
 * form — reading it in the row itself would always return `pending: false`. These jobs take
 * seconds, not milliseconds (the provider ingestion reads five pages with a pause between each),
 * so a button that doesn't visibly respond would get pressed repeatedly.
 */
function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="whitespace-nowrap rounded-lg border border-line bg-charcoal-3 px-3 py-1.5 text-xs font-bold text-pitch-bright transition-colors hover:border-[rgba(34,201,116,0.4)] hover:bg-charcoal disabled:cursor-not-allowed disabled:text-floodlight-faint"
    >
      {pending ? "Updating…" : "Update"}
    </button>
  );
}

export type JobRowProps = {
  job: {
    key: string;
    name: string;
    description: string;
    schedule: string;
    cron: string;
    requires: string | null;
  };
  /** Pre-formatted server-side, so the row renders identically before and after hydration. */
  lastRun: {
    relative: string;
    exact: string;
    trigger: "cron" | "manual";
    ok: boolean;
    summary: string;
    actorName: string | null;
  } | null;
};

const INITIAL: JobActionState = { ok: true, message: "", job: null };

export function JobRow({ job, lastRun }: JobRowProps) {
  const [state, formAction] = useActionState(triggerJob, INITIAL);

  return (
    <li className="rounded-lg border border-line bg-charcoal-3 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[240px] flex-1">
          <p className="text-sm font-bold">{job.name}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-floodlight-dim">
            {job.description}
          </p>
        </div>

        <form action={formAction} className="shrink-0">
          <input type="hidden" name="job" value={job.key} />
          <UpdateButton />
        </form>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold text-floodlight-faint">Meant to run</dt>
        <dd className="text-floodlight-dim">
          {job.schedule} <span className="font-mono text-floodlight-faint">({job.cron})</span>
          {job.requires ? (
            <span className="text-floodlight-faint"> · needs {job.requires}</span>
          ) : null}
        </dd>

        <dt className="font-semibold text-floodlight-faint">Last update</dt>
        <dd className="text-floodlight-dim">
          {lastRun ? (
            <>
              <span title={lastRun.exact}>{lastRun.relative}</span>{" "}
              <span className="text-floodlight-faint">
                ({lastRun.trigger === "manual"
                  ? `by hand${lastRun.actorName ? ` — ${lastRun.actorName}` : ""}`
                  : "scheduled"}
                )
              </span>
              {!lastRun.ok ? (
                <span className="ml-1.5 rounded bg-[rgba(255,71,87,0.14)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-whistle">
                  Failed
                </span>
              ) : null}
              <span className="mt-0.5 block text-floodlight-faint">{lastRun.summary}</span>
            </>
          ) : (
            // Distinct from "ran and did nothing" — this job has no recorded run at all, which
            // on a fresh deployment is expected rather than alarming.
            <span className="text-floodlight-faint">
              No run recorded yet — it will appear here after the next one.
            </span>
          )}
        </dd>
      </dl>

      {/* The result of a run started from this row, shown until the page is reloaded. */}
      {state.job === job.key && state.message ? (
        <p
          role="status"
          className={`mt-2.5 rounded border px-2.5 py-1.5 text-[12px] ${
            state.ok
              ? "border-[rgba(34,201,116,0.3)] bg-[rgba(34,201,116,0.08)] text-pitch-bright"
              : "border-[rgba(255,71,87,0.3)] bg-[rgba(255,71,87,0.08)] text-whistle"
          }`}
        >
          {state.ok ? "Updated" : "Failed"} — {state.message}
        </p>
      ) : null}
    </li>
  );
}
