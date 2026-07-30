import { NextResponse } from "next/server";
import { syncStandings } from "@/lib/sync/standings";
import { isFootballDataConfigured } from "@/lib/football-data";

// Mongoose and the provider fetch both need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Five sequential provider requests, each of which may wait on the rate limiter. */
export const maxDuration = 120;

/**
 * Refreshes the league tables. Driven by Vercel Cron every 15 minutes (see vercel.json).
 *
 * Separate from the score sync deliberately: standings are one request per competition
 * against a shared 10-per-minute budget, so keeping them on their own schedule means a
 * slow table fetch can never delay a live score, and a rate limit here can't stop scores
 * updating.
 *
 * Worth knowing: a table only actually changes when a match finishes, so most runs write
 * nothing and report every row as unchanged. That's expected — the 15-minute cadence
 * buys promptness after a final whistle, not freshness that wasn't there.
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
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY is not set." }, { status: 503 });
  }

  try {
    const result = await syncStandings();

    // A partial failure still returns 200: some tables updated, and a non-2xx would make
    // Vercel report the whole cron as broken when it mostly worked.
    return NextResponse.json({ ok: result.failed.length === 0, ...result });
  } catch (error) {
    console.error("Standings sync failed:", error);
    return NextResponse.json({ ok: false, error: "Sync failed." }, { status: 500 });
  }
}
