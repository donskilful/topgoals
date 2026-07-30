import { NextResponse } from "next/server";
import { syncMatches } from "@/lib/sync/matches";
import { FootballDataError, isFootballDataConfigured } from "@/lib/football-data";

// Mongoose and the provider fetch both need the Node runtime.
export const runtime = "nodejs";
// Never cached — the entire point is fresh data.
export const dynamic = "force-dynamic";

/**
 * Pulls live scores from football-data.org. Called by Vercel Cron (see vercel.json).
 *
 * Vercel signs its own cron invocations with an Authorization header carrying
 * CRON_SECRET; requiring it means a stranger who finds this URL can't burn through
 * the provider's rate limit on our behalf.
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

  if (!isFootballDataConfigured()) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_API_KEY is not set." },
      { status: 503 },
    );
  }

  try {
    const result = await syncMatches();
    console.log("Score sync:", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    // Log and report, but return 200 for rate limits so Vercel doesn't treat an
    // expected throttle as a failing cron job.
    if (error instanceof FootballDataError) {
      console.warn("Score sync skipped:", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status === 429 ? 200 : 502 },
      );
    }

    console.error("Score sync failed:", error);
    return NextResponse.json({ ok: false, error: "Sync failed." }, { status: 500 });
  }
}
