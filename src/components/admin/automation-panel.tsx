import { AUTOMATION_JOBS } from "@/lib/jobs";
import { getLastRuns } from "@/lib/sync/run-job";
import { dateTimeFormatter, relativeTime } from "@/lib/format";
import { JobRow } from "@/components/admin/job-row";

/**
 * Everything on the site that updates itself, and a button to update it now.
 *
 * Admin-only, matching the action behind the buttons. It is rendered on the dashboard rather
 * than tucked away on its own page because the thing it guards against is a job quietly dying:
 * that's only caught if somebody sees it without going looking, and the dashboard is the page
 * everyone lands on.
 *
 * Times are formatted here, on the server, and passed down as strings. Formatting a relative
 * time in a client component makes the server and client render different text at the moment a
 * minute ticks over, which React reports as a hydration error.
 */
export async function AutomationPanel() {
  const lastRuns = await getLastRuns();
  const now = new Date();

  const automationOn = process.env.NEWS_AUTOMATION === "on";
  const gatedJobs = AUTOMATION_JOBS.filter((job) => job.gatedByAutomation).length;

  return (
    <section className="mt-8 rounded-xl border border-line bg-charcoal p-4">
      <h2 className="font-display text-lg uppercase tracking-wide">Automation</h2>
      <p className="mt-1 mb-4 max-w-2xl text-[12px] leading-relaxed text-floodlight-dim">
        These run on a schedule without anyone doing anything. Use{" "}
        <span className="font-bold text-floodlight">Update</span> to run one now — it runs exactly
        what the schedule runs, and the result is recorded either way.
      </p>

      {/* Named rather than implied: two of the five jobs do nothing at all while this is off,
          and their rows would otherwise look like unexplained silence. */}
      {!automationOn && gatedJobs > 0 ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.08)] px-3 py-2 text-[12px] text-torch"
        >
          <b>NEWS_AUTOMATION is off.</b> {gatedJobs} of these jobs are skipped on their schedule
          until it is set to &quot;on&quot;. Update still runs them by hand.
        </p>
      ) : null}

      <ul className="grid gap-3">
        {AUTOMATION_JOBS.map((job) => {
          const last = lastRuns.get(job.key);

          return (
            <JobRow
              key={job.key}
              job={{
                key: job.key,
                name: job.name,
                description: job.description,
                schedule: job.schedule,
                cron: job.cron,
                requires: job.requires,
              }}
              lastRun={
                last
                  ? {
                      relative: relativeTime(new Date(last.ranAt), now),
                      exact: dateTimeFormatter.format(new Date(last.ranAt)),
                      trigger: last.trigger,
                      ok: last.ok,
                      summary: last.summary,
                      actorName: last.actorName,
                    }
                  : null
              }
            />
          );
        })}
      </ul>
    </section>
  );
}
