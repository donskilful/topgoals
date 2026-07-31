import { NextResponse } from "next/server";
import { syncTipResults } from "@/lib/sync/tip-results";

// Mongoose needs the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Settles tips from the results we already hold. Driven by Vercel Cron (see vercel.json).
 *
 * Runs hourly rather than the five-hourly cadence originally sketched, because it makes no
 * provider requests at all — it reads finished fixtures out of our own database, which the
 * score sync refreshes every five minutes. Since it costs nothing, there's no reason to leave
 * a settled result unpublished for up to five hours.
 *
 * Guarded by `CRON_SECRET` only. Deliberately *not* behind `NEWS_AUTOMATION`: that switch
 * governs publishing generated content, whereas this only grades tips a human already
 * published. Leaving results unsettled is the harmful state — it inflates the win rate by
 * omission — so this should keep running even with content automation switched off.
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

  try {
    const result = await syncTipResults();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Tip settlement failed:", error);
    return NextResponse.json({ ok: false, error: "Settlement failed." }, { status: 500 });
  }
}
