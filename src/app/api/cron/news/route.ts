import { NextResponse } from "next/server";
import { syncHeadlines } from "@/lib/sync/headlines";
import { syncReports } from "@/lib/sync/reports";
import { syncNewsArticles } from "@/lib/sync/news-articles";

// Mongoose and the feed fetches both need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Feeds are fetched in parallel but each allows up to 25s, and the report writer then
 * does a series of database writes. That can exceed Vercel's default function timeout,
 * which would kill the run partway through — so the ceiling is set explicitly.
 */
export const maxDuration = 120;

/**
 * Refreshes the "around the web" headline list, publishes match reports, and publishes
 * news/transfer articles written from the facts in the feeds.
 *
 * All three are plain JavaScript — no language model and no per-article cost. Reports are
 * generated from finished matches already in our database, so this makes no requests to
 * football-data.org either; the only outbound traffic is reading the RSS feeds.
 *
 * Gates:
 *  - `CRON_SECRET` — stops a stranger who finds the URL from driving the job.
 *  - `NEWS_AUTOMATION` — kill switch. Must be exactly "on"; defaults to off, so a
 *    deployment that merely carries the code doesn't start publishing.
 */
export async function GET(request: Request) {
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

  if (process.env.NEWS_AUTOMATION !== "on") {
    return NextResponse.json(
      { ok: false, disabled: true, error: "News automation is switched off (NEWS_AUTOMATION)." },
      { status: 200 },
    );
  }

  // Each runs independently: a feed outage shouldn't stop reports being written from data
  // we already hold, and one failing half shouldn't stale the others.
  const [headlines, reports, articles] = await Promise.allSettled([
    syncHeadlines(),
    syncReports(),
    syncNewsArticles(),
  ]);

  if (headlines.status === "rejected") console.error("Headline sync failed:", headlines.reason);
  if (reports.status === "rejected") console.error("Report sync failed:", reports.reason);
  if (articles.status === "rejected") console.error("News article sync failed:", articles.reason);

  const body = {
    ok: [headlines, reports, articles].some((r) => r.status === "fulfilled"),
    headlines: headlines.status === "fulfilled" ? headlines.value : null,
    reports: reports.status === "fulfilled" ? reports.value : null,
    articles: articles.status === "fulfilled" ? articles.value : null,
  };

  console.log("Content sync:", body);

  return NextResponse.json(body, { status: body.ok ? 200 : 500 });
}
