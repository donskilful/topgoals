import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";
import { formatKickoffTime } from "@/lib/format";
import type { TipConfidence } from "@/lib/constants";
import { publicRead } from "@/lib/data/public-read";

/**
 * Applied to every public read on this module.
 *
 * Tips ingested from a provider are stored unpublished until that provider has built a verified
 * record on results we settled ourselves, so this filter is what keeps unproven scraped picks off
 * the site. It also keeps the published win rate honest in the other direction: the rate describes
 * the tips we actually showed readers, not a wider pool they never saw.
 *
 * `$ne: false` rather than `true`, so tips created before this field existed still read as
 * published — which they were.
 */
const PUBLISHED = { published: { $ne: false } } as const;

/**
 * Odds and confidence are nullable throughout.
 *
 * A tip ingested from a provider has neither — the provider publishes a selection and nothing
 * else. Rather than fill the gap with a plausible number, the absence is carried all the way to
 * the UI and shown as "—". See the `odds` field on the Tip model for why inventing one would be
 * worse than showing nothing.
 */
export type TipCard = {
  id: string;
  competition: string;
  kickoff: string;
  fixture: string;
  pick: string;
  odds: string | null;
  confidence: TipConfidence | null;
  /** Attribution when the selection came from a provider rather than from us. */
  source: { name: string; url: string | null } | null;
};

export type TrendingTipCard = {
  id: string;
  fixture: string;
  pick: string;
  odds: string | null;
};

export type SettledResult = { id: string; result: "W" | "L" };

/**
 * Tips a reader can still act on: pending, and not yet kicked off.
 *
 * The kick-off filter is the important half. Without it this returned every pending tip
 * regardless of age, so anything left unsettled sat under "Today's Picks" indefinitely — and
 * since the card shows a time but no date, a week-old selection read as today's. Worse, a tip
 * whose match has already started can't be backed at the quoted odds, so presenting it as a
 * pick is misleading even when the data is fresh.
 */
export async function getTodaysTips(limit = 3): Promise<TipCard[]> {
  return publicRead("getTodaysTips", [], async () => {
    await dbConnect();

    const tips = await Tip.find({ ...PUBLISHED, result: "pending", kickoffAt: { $gte: new Date() } })
      .sort({ kickoffAt: 1 })
      .limit(limit)
      .lean();

    return tips.map((tip) => ({
      id: String(tip._id),
      competition: tip.competition,
      kickoff: formatKickoffTime(tip.kickoffAt),
      fixture: tip.fixture,
      pick: tip.pick,
      odds: tip.odds ?? null,
      confidence: (tip.confidence as TipConfidence | null) ?? null,
      source: tip.source ? { name: tip.source.name, url: tip.source.url ?? null } : null,
    }));
  });
}

export async function getTrendingTips(limit = 3): Promise<TrendingTipCard[]> {
  return publicRead("getTrendingTips", [], async () => {
    await dbConnect();

    // Ranked by confidence, since there's no click-through data to rank by yet. Same
    // not-yet-kicked-off rule as getTodaysTips — a started match isn't a tip any more.
    const tips = await Tip.find({ ...PUBLISHED, result: "pending", kickoffAt: { $gte: new Date() } })
      .sort({ confidence: -1, kickoffAt: 1 })
      .limit(limit)
      .lean();

    return tips.map((tip) => ({
      id: String(tip._id),
      fixture: tip.fixture,
      pick: tip.pick,
      odds: tip.odds ?? null,
    }));
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The W/L pills in the trust strip.
 *
 * Prefers yesterday's settled tips, since that's what the design promises. If
 * nothing ran yesterday (a quiet Monday, a new site) it widens to the last week and
 * says so, rather than showing an empty row under a "Yesterday" heading.
 */
export async function getRecentResults(
  limit = 6,
): Promise<{ results: SettledResult[]; label: string }> {
  // Empty results with the neutral label: the section renders its heading and simply
  // shows no W/L pills, rather than claiming "Yesterday's Tips" and listing nothing.
  return publicRead("getRecentResults", { label: "Recent Results", results: [] }, async () => {
    await dbConnect();

    const now = Date.now();
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

    const settled = { ...PUBLISHED, result: { $in: ["won", "lost"] } } as const;

    const yesterday = await Tip.find({
      ...settled,
      kickoffAt: { $gte: new Date(startOfToday - DAY_MS), $lt: new Date(startOfToday) },
    })
      .sort({ kickoffAt: 1 })
      .limit(limit)
      .lean();

    const chosen = yesterday.length > 0 ? yesterday : null;

    if (chosen) {
      return {
        label: "Yesterday's Tips",
        results: chosen.map((tip) => ({
          id: String(tip._id),
          result: tip.result === "won" ? "W" : "L",
        })),
      };
    }

    const recent = await Tip.find({ ...settled, kickoffAt: { $gte: new Date(now - 7 * DAY_MS) } })
      .sort({ kickoffAt: -1 })
      .limit(limit)
      .lean();

    return {
      label: "Recent Results",
      results: recent
        .reverse()
        .map((tip) => ({ id: String(tip._id), result: tip.result === "won" ? "W" : "L" })),
    };
  });
}

export type TipStats = { winRate: string; units: string; period: string; hasData: boolean };

/**
 * Rolling 30-day win rate and profit, aggregated from settled tips.
 *
 * Deliberately computed rather than stored: a hand-maintained figure drifts from
 * reality the first time someone forgets to update it after a losing day, and on a
 * betting-tips site that number is the whole basis of trust.
 *
 * Profit is in units staked: a winner returns (odds - 1), a loser costs 1, and a
 * void is a push. Odds are stored as strings to preserve their display form, so
 * they're converted to a double inside the pipeline.
 *
 * Tips with no recorded price are counted in the win rate but left out of the profit entirely,
 * and the caption says how many the profit covers when the two differ. A selection scraped from
 * a provider has no odds, and there's no honest way to include it: assuming a price would invent
 * a return, while treating it as 1.00 would count a winner as breaking even and drag the figure
 * down. Win rate needs no price, so it uses everything.
 */
export async function getTipStats(): Promise<TipStats> {
  // Same shape the "no settled tips yet" case already uses, so the card renders its
  // placeholder state instead of the section vanishing or the page failing.
  const unavailable = {
    winRate: "—",
    units: "no settled tips yet",
    period: "Last 30 days",
    hasData: false,
  };

  return publicRead("getTipStats", unavailable, async () => {
    await dbConnect();

    const since = new Date(Date.now() - 30 * DAY_MS);

    // A price we can actually stake at: recorded, and a number above 1.
    const priced = {
      $and: [
        { $ne: ["$odds", null] },
        { $gt: [{ $convert: { input: "$odds", to: "double", onError: 0, onNull: 0 } }, 1] },
      ],
    };

    const [summary] = await Tip.aggregate<{
      won: number;
      lost: number;
      profit: number;
      pricedDecided: number;
    }>([
      {
        $match: {
          ...PUBLISHED,
          result: { $in: ["won", "lost", "void"] },
          kickoffAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          won: { $sum: { $cond: [{ $eq: ["$result", "won"] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ["$result", "lost"] }, 1, 0] } },
          pricedDecided: {
            $sum: {
              $cond: [{ $and: [priced, { $in: ["$result", ["won", "lost"]] }] }, 1, 0],
            },
          },
          profit: {
            $sum: {
              $switch: {
                branches: [
                  {
                    case: { $and: [{ $eq: ["$result", "won"] }, priced] },
                    then: {
                      $subtract: [
                        { $convert: { input: "$odds", to: "double", onError: 0, onNull: 0 } },
                        1,
                      ],
                    },
                  },
                  { case: { $and: [{ $eq: ["$result", "lost"] }, priced] }, then: -1 },
                ],
                default: 0,
              },
            },
          },
        },
      },
    ]);

    const won = summary?.won ?? 0;
    const lost = summary?.lost ?? 0;
    const decided = won + lost;

    if (decided === 0) {
      return { winRate: "—", units: "no settled tips yet", period: "Last 30 days", hasData: false };
    }

    const winRate = `${Math.round((won / decided) * 100)}%`;
    const pricedDecided = summary?.pricedDecided ?? 0;

    if (pricedDecided === 0) {
      // Win rate is real; there is simply no price on any of it to compute a return from.
      return { winRate, units: "no priced tips yet", period: "Last 30 days", hasData: true };
    }

    const rounded = Math.round((summary?.profit ?? 0) * 10) / 10;
    const units = `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)} units`;

    return {
      winRate,
      // Says what the profit covers whenever it isn't the whole sample, so the two numbers on
      // the card can't be read as describing the same set of tips when they don't.
      units:
        pricedDecided < decided ? `${units} from ${pricedDecided} priced tips` : units,
      period: "Last 30 days",
      hasData: true,
    };
  });
}

/** Full tips list for the /tips page, newest first. */
export async function getAllTips(limit = 50) {
  return publicRead("getAllTips", [], async () => {
    await dbConnect();

    const tips = await Tip.find(PUBLISHED).sort({ kickoffAt: -1 }).limit(limit).lean();

    return tips.map((tip) => ({
      id: String(tip._id),
      competition: tip.competition,
      kickoff: formatKickoffTime(tip.kickoffAt),
      kickoffAt: tip.kickoffAt.toISOString(),
      fixture: tip.fixture,
      pick: tip.pick,
      odds: tip.odds ?? null,
      confidence: (tip.confidence as TipConfidence | null) ?? null,
      result: tip.result,
      source: tip.source ? { name: tip.source.name, url: tip.source.url ?? null } : null,
    }));
  });
}
