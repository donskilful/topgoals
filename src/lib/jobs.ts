import { syncMatches } from "@/lib/sync/matches";
import { syncStandings } from "@/lib/sync/standings";
import { syncHeadlines } from "@/lib/sync/headlines";
import { syncReports } from "@/lib/sync/reports";
import { syncNewsArticles } from "@/lib/sync/news-articles";
import { syncTipResults } from "@/lib/sync/tip-results";
import { syncProviderTips } from "@/lib/sync/provider-tips";
import { isFootballDataConfigured } from "@/lib/football-data";

/**
 * Every automated job on the site, in one place.
 *
 * Previously the only description of what runs automatically was `vercel.json` — five paths and
 * five cron expressions, with the actual behaviour scattered across route handlers. Nothing in
 * the CMS listed them, so an editor had no way to know what refreshes itself, how often, or
 * whether it was still working.
 *
 * This registry is the single description. The cron routes execute from it, the admin dashboard
 * renders from it, and the manual "Update" button runs the same `run()` the cron does — so what
 * an editor triggers by hand is never a different code path from the scheduled one.
 *
 * **`schedule` has to be kept in step with `vercel.json` by hand.** Vercel reads the crons from
 * that file and nothing validates the two against each other, so a change there needs a matching
 * change here. It's duplicated deliberately: the alternative is parsing cron expressions into
 * English at render time, which is a lot of machinery to avoid maintaining five short strings.
 */

/**
 * Whether these schedules are actually running.
 *
 * **False, because the deployment is on Vercel's Hobby plan, which only permits daily crons.**
 * Every schedule below runs more often than that, so `vercel.json` declares no crons at all and
 * Vercel deploys nothing to run them. The intended schedules are still recorded on each job —
 * they're the design, and they're what gets restored — but nothing fires them today.
 *
 * Declared as a constant rather than detected, because there is no API that reports the account
 * plan and a wrong guess here would be the worst outcome: the CMS would tell an editor a job
 * refreshes itself every five minutes when nothing refreshes it at all, and stale data would go
 * unnoticed for exactly as long as they believed it.
 *
 * To turn scheduling back on: upgrade the Vercel account to Pro, restore the `crons` array in
 * `vercel.json` (one entry per job below, using its `cron` expression), and set this to true.
 */
export const SCHEDULING_ENABLED = false;

export type JobResult = {
  ok: boolean;
  /** One line for the dashboard and the run log. */
  summary: string;
};

export type AutomationJob = {
  key: string;
  name: string;
  /** What it does, in an editor's terms rather than a developer's. */
  description: string;
  /** Human reading of the cron expression below. */
  schedule: string;
  /** The expression as configured in vercel.json, shown for reference. */
  cron: string;
  /** Why it might be idle even though it's scheduled. Null when nothing gates it. */
  requires: string | null;
  /** True when `NEWS_AUTOMATION` must be "on" for the scheduled run to do anything. */
  gatedByAutomation: boolean;
  run: () => Promise<JobResult>;
};

/** Turns a count map into "4 created, 2 updated", dropping the zeroes. */
function summarise(parts: Record<string, number>, empty: string): string {
  const written = Object.entries(parts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`);

  return written.length > 0 ? written.join(", ") : empty;
}

export const AUTOMATION_JOBS: AutomationJob[] = [
  {
    key: "scores",
    name: "Live scores & fixtures",
    description:
      "Pulls the current fixture window from football-data.org — kick-offs, scores and status. Matches an editor has corrected by hand are never overwritten.",
    schedule: "Every 5 minutes",
    cron: "*/5 * * * *",
    requires: "FOOTBALL_DATA_API_KEY",
    gatedByAutomation: false,
    async run() {
      if (!isFootballDataConfigured()) {
        return { ok: false, summary: "FOOTBALL_DATA_API_KEY is not set." };
      }

      const result = await syncMatches();

      return {
        ok: true,
        summary: `${result.fetched} fetched — ${summarise(
          {
            created: result.created,
            updated: result.updated,
            unchanged: result.unchanged,
            "left alone (edited by hand)": result.skippedManual,
          },
          "nothing to change",
        )}`,
      };
    },
  },
  {
    key: "standings",
    name: "League tables",
    description:
      "Refreshes the league tables. A table is skipped rather than published when its season hasn't started, so a new campaign never shows last season's finish.",
    schedule: "Every 15 minutes",
    cron: "*/15 * * * *",
    requires: "FOOTBALL_DATA_API_KEY",
    gatedByAutomation: false,
    async run() {
      if (!isFootballDataConfigured()) {
        return { ok: false, summary: "FOOTBALL_DATA_API_KEY is not set." };
      }

      const result = await syncStandings();
      const skipped = result.skipped.length;
      const failed = result.failed.length;
      const attempted = result.competitions + skipped + failed;

      // Tables and rows are counted separately and said so. Folding them into one list read as
      // "0 competitions — 6 unchanged, 5 skipped", where the 6 were rows and the 5 were
      // competitions — three numbers in two different units with nothing to tell them apart.
      const tables = summarise(
        { skipped, failed },
        result.competitions > 0 ? "all published" : "none published",
      );

      return {
        ok: failed === 0,
        summary:
          `${result.competitions}/${attempted} tables published (${tables}) — ` +
          summarise(
            {
              "rows created": result.created,
              "rows updated": result.updated,
              "rows unchanged": result.unchanged,
              "rows removed": result.removed,
            },
            "no row changes",
          ),
      };
    },
  },
  {
    key: "news",
    name: "News, transfers & match reports",
    description:
      "Reads the Sky Sports and Guardian football feeds, writes our own articles from the facts in the headlines, and generates match reports and a results round-up from finished fixtures.",
    schedule: "Every 2 hours",
    cron: "0 */2 * * *",
    requires: "NEWS_AUTOMATION=on",
    gatedByAutomation: true,
    async run() {
      // Independently, as the cron does: a feed outage shouldn't stop reports being written
      // from fixtures we already hold.
      const [headlines, reports, articles] = await Promise.allSettled([
        syncHeadlines(),
        syncReports(),
        syncNewsArticles(),
      ]);

      const failures = [headlines, reports, articles].filter((r) => r.status === "rejected");

      for (const failure of failures) {
        console.error("News job part failed:", (failure as PromiseRejectedResult).reason);
      }

      const counts: Record<string, number> = {};
      if (headlines.status === "fulfilled") counts["headlines"] = headlines.value.created;
      if (reports.status === "fulfilled") {
        counts["match reports"] = reports.value.reportsPublished;
        // A round-up is one article, but a boolean — counted so a run that produced only the
        // round-up doesn't report "nothing new to publish".
        counts["results round-up"] = reports.value.roundupPublished ? 1 : 0;
      }
      if (articles.status === "fulfilled") counts["articles"] = articles.value.published;

      return {
        ok: failures.length === 0,
        summary:
          summarise(counts, "nothing new to publish") +
          (failures.length > 0 ? ` — ${failures.length} part(s) failed, see logs` : ""),
      };
    },
  },
  {
    key: "tip-results",
    name: "Tip settlement",
    description:
      "Grades pending tips against the real scoreline. A selection it can't read, or a fixture it can't identify beyond doubt, is left pending for a human rather than guessed at.",
    schedule: "Every hour",
    cron: "10 * * * *",
    // Deliberately not gated: leaving results unsettled inflates the win rate by omission.
    requires: null,
    gatedByAutomation: false,
    async run() {
      const result = await syncTipResults();

      return {
        ok: result.failed === 0,
        summary: `${result.pending} due — ${summarise(
          {
            won: result.won,
            lost: result.lost,
            void: result.void,
            "left for a human": result.skipped.length,
            failed: result.failed,
          },
          "nothing ready to settle",
        )}`,
      };
    },
  },
  {
    key: "provider-tips",
    name: "Provider tip ingestion",
    description:
      "Reads published picks from tips providers and stores the ones we can settle. Picks stay tracked but unpublished until the provider has earned a verified record on our own results.",
    schedule: "Twice daily, 06:30 and 15:30 UTC",
    cron: "30 6,15 * * *",
    requires: "NEWS_AUTOMATION=on",
    gatedByAutomation: true,
    async run() {
      const results = await syncProviderTips();

      const totals = results.reduce(
        (sum, r) => ({
          scraped: sum.scraped + r.scraped,
          stored: sum.stored + r.stored,
          published: sum.published + r.published,
          duplicates: sum.duplicates + r.duplicates,
          failed: sum.failed + r.failed,
        }),
        { scraped: 0, stored: 0, published: 0, duplicates: 0, failed: 0 },
      );

      return {
        ok: totals.failed === 0,
        summary: `${totals.scraped} picks read — ${summarise(
          {
            stored: totals.stored,
            published: totals.published,
            "already held": totals.duplicates,
            failed: totals.failed,
          },
          "nothing new to store",
        )}`,
      };
    },
  },
];

export function findJob(key: string): AutomationJob | undefined {
  return AUTOMATION_JOBS.find((job) => job.key === key);
}
