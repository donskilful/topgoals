import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";

/**
 * How each tips provider is actually performing, measured on our own settled results.
 *
 * The figures here are computed from tips *we* graded against real scorelines — never from a
 * strike rate a provider advertises about itself. Every tipster site on the internet claims a
 * winning record; none of them publish the losing slips. The only number worth acting on is the
 * one we produced ourselves from fixtures we can verify, so that's the only number this returns.
 *
 * This is also the gate on publishing. Ingested tips arrive unpublished and stay that way until
 * their provider clears the bar below, which is why a provider's advertised claims are irrelevant
 * to whether its picks ever reach a reader.
 */

/**
 * Settled tips a provider needs before its record means anything.
 *
 * Thirty is not a statistically comfortable sample — it isn't meant to be. It's the point at
 * which a run of luck stops being the most likely explanation for a good record, chosen so a
 * provider can qualify within a fortnight or so rather than a season. The bar is a filter
 * against noise, not a proof of skill, and the published record always shows the sample size
 * alongside the rate so a reader can judge it for themselves.
 */
export const MIN_SETTLED_TIPS = 30;

/**
 * Win rate a provider must hold to be published, as a percentage.
 *
 * Set at break-even-ish for the short-priced selections these providers deal in rather than at
 * the 80% the feature was originally sketched around. Nothing on the pages we read publishes a
 * probability, so 80% was never measurable at ingestion; and demanding it of a *verified* record
 * would reject every real tipster alive, since sustained 80% strike rates don't exist outside
 * marketing copy. This is a floor for "beats guessing", not a promise of anything.
 */
export const MIN_WIN_RATE = 55;

export type ProviderRecord = {
  name: string;
  /** Tips that reached a win or a loss. Voids are excluded — they decide nothing. */
  settled: number;
  won: number;
  lost: number;
  void: number;
  /** Still waiting on a result. */
  pending: number;
  /** Percentage of decided tips that won, or null below the minimum sample. */
  winRate: number | null;
  /** Whether this provider's picks are currently published. */
  qualified: boolean;
  /** Plain-language reason, for the CMS. */
  status: string;
};

/**
 * Every provider we hold tips from, best record first.
 *
 * Unqualified providers are included deliberately: a provider quietly failing to reach the bar
 * is exactly what an editor needs to see, and hiding it would make the leaderboard look like a
 * list of winners rather than an assessment.
 */
export async function getProviderRecords(): Promise<ProviderRecord[]> {
  await dbConnect();

  const rows = await Tip.aggregate<{
    _id: string;
    won: number;
    lost: number;
    void: number;
    pending: number;
  }>([
    { $match: { "source.name": { $ne: null } } },
    {
      $group: {
        _id: "$source.name",
        won: { $sum: { $cond: [{ $eq: ["$result", "won"] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ["$result", "lost"] }, 1, 0] } },
        void: { $sum: { $cond: [{ $eq: ["$result", "void"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$result", "pending"] }, 1, 0] } },
      },
    },
  ]);

  const records = rows.map((row) => {
    const settled = row.won + row.lost;
    const winRate = settled >= MIN_SETTLED_TIPS ? Math.round((row.won / settled) * 100) : null;
    const qualified = winRate !== null && winRate >= MIN_WIN_RATE;

    return {
      name: row._id,
      settled,
      won: row.won,
      lost: row.lost,
      void: row.void,
      pending: row.pending,
      winRate,
      qualified,
      status: describe(settled, winRate, qualified),
    };
  });

  // Qualified first, then by rate, then by sample — an unproven provider never outranks a
  // proven one just because its small sample happens to look good.
  return records.sort(
    (a, b) =>
      Number(b.qualified) - Number(a.qualified) ||
      (b.winRate ?? -1) - (a.winRate ?? -1) ||
      b.settled - a.settled,
  );
}

function describe(settled: number, winRate: number | null, qualified: boolean): string {
  if (winRate === null) {
    const remaining = MIN_SETTLED_TIPS - settled;
    return `Building a record — ${settled} of ${MIN_SETTLED_TIPS} settled tips, ${remaining} to go. Picks are tracked but not published.`;
  }

  if (!qualified) {
    return `${winRate}% over ${settled} settled tips, below the ${MIN_WIN_RATE}% bar. Picks are tracked but not published.`;
  }

  return `${winRate}% over ${settled} settled tips. Picks are published.`;
}

/**
 * The provider names currently allowed to publish.
 *
 * Read by ingestion on every run, so a provider whose record slips stops publishing on the next
 * cycle without anybody intervening — and one that recovers starts again.
 */
export async function getQualifiedProviders(): Promise<Set<string>> {
  const records = await getProviderRecords();
  return new Set(records.filter((record) => record.qualified).map((record) => record.name));
}
