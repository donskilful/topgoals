import { NextResponse } from "next/server";
import { syncProviderTips } from "@/lib/sync/provider-tips";

// Mongoose needs the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Five provider pages read sequentially with a pause between them, then a fixture lookup per
// pick. Comfortably inside this, but the default 10s is not enough.
export const maxDuration = 300;

/**
 * Ingests provider picks. Driven by Vercel Cron (see vercel.json).
 *
 * Runs twice a day: early, to catch the day's cards as the provider posts them, and again in the
 * afternoon for evening kick-offs added later. More often would mostly re-read the same picks,
 * which ingestion already dedupes but the provider still has to serve.
 *
 * Guarded by `CRON_SECRET`, and additionally by `NEWS_AUTOMATION` — unlike settlement, this
 * *publishes* content, so it belongs behind the same switch as the rest of the automated
 * publishing. Turning that switch off stops new picks arriving; it does not stop tips already
 * posted from being settled, which is deliberate.
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
    return NextResponse.json({ ok: true, skipped: "NEWS_AUTOMATION is not on." });
  }

  try {
    const providers = await syncProviderTips();
    return NextResponse.json({ ok: true, providers });
  } catch (error) {
    console.error("Provider tip ingestion failed:", error);
    return NextResponse.json({ ok: false, error: "Ingestion failed." }, { status: 500 });
  }
}
