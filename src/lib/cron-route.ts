import { NextResponse } from "next/server";
import { findJob } from "@/lib/jobs";
import { runJob } from "@/lib/sync/run-job";

/**
 * The shared body of every `/api/cron/*` handler.
 *
 * The five routes were near-identical copies of the same secret check, kill-switch check and
 * try/catch, each with its own small differences in how it reported failure. Collapsing them
 * means the guards can't drift apart — and, more importantly, that every scheduled run is
 * recorded the same way the manual ones are, so the dashboard's "last run" is trustworthy for
 * all five rather than whichever ones remembered to record.
 *
 * Status codes are chosen so Vercel's cron monitoring stays meaningful:
 *  - **503** — misconfigured (no secret). Genuinely broken, worth alerting on.
 *  - **401** — bad or missing secret.
 *  - **200 with `skipped`** — the kill switch is off. Not a failure; the job is off on purpose.
 *  - **200 with `ok: false`** — the job ran and reported a problem (a rate limit, a dead feed).
 *    Deliberately not a 5xx: these are expected, self-correcting, and paging on them trains
 *    everyone to ignore the alerts.
 */
export async function runCronJob(request: Request, key: string) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set, so this endpoint is disabled." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const job = findJob(key);

  if (!job) {
    return NextResponse.json({ error: `Unknown job "${key}".` }, { status: 404 });
  }

  if (job.gatedByAutomation && process.env.NEWS_AUTOMATION !== "on") {
    // Not recorded as a run: nothing ran. Recording it would reset "last run" and make a
    // switched-off job look like a healthy one.
    return NextResponse.json({
      ok: true,
      skipped: "NEWS_AUTOMATION is not on.",
      job: key,
    });
  }

  // runJob never throws — a failing job is recorded and reported, not lost.
  const outcome = await runJob(key, "cron");

  return NextResponse.json(outcome, { status: 200 });
}
