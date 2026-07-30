import { NextResponse } from "next/server";
import { syncNews } from "@/lib/sync/news";
import { isDrafterConfigured } from "@/lib/ai/draft-article";

// Mongoose, the feed fetches and the Anthropic SDK all need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Drafting several articles at high quality takes a while; the default 10s serverless
 * limit would kill the run partway through. 300s is Vercel's ceiling on the Pro plan
 * and comfortably covers a four-article run.
 */
export const maxDuration = 300;

/**
 * Publishes news articles written from the public football feeds. Driven by Vercel Cron
 * (see vercel.json).
 *
 * Three gates, all deliberate:
 *  - `CRON_SECRET` — without it a stranger who finds this URL could spend our Claude
 *    budget and flood the site with articles.
 *  - `NEWS_AUTOMATION` — the kill switch. Set it to anything other than "on" and the
 *    pipeline stops, with no redeploy needed. Worth knowing where this is, because
 *    articles publish without review.
 *  - `ANTHROPIC_API_KEY` — no key, no drafting. Reported as 503 rather than failing
 *    silently.
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

  // Default off: automation has to be switched on explicitly, so a deployment that
  // merely carries the code doesn't start publishing.
  if (process.env.NEWS_AUTOMATION !== "on") {
    return NextResponse.json(
      { ok: false, disabled: true, error: "News automation is switched off (NEWS_AUTOMATION)." },
      { status: 200 },
    );
  }

  if (!isDrafterConfigured()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 503 });
  }

  try {
    const result = await syncNews();
    console.log("News sync:", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("News sync failed:", error);
    return NextResponse.json({ ok: false, error: "Sync failed." }, { status: 500 });
  }
}
