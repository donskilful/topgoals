import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";
import { formatKickoffTime } from "@/lib/format";
import type { TipConfidence } from "@/lib/constants";
import { publicRead } from "@/lib/data/public-read";

export type TipCard = {
  id: string;
  competition: string;
  kickoff: string;
  fixture: string;
  pick: string;
  odds: string;
  confidence: TipConfidence;
};

export type TrendingTipCard = {
  id: string;
  fixture: string;
  pick: string;
  odds: string;
};

export type SettledResult = { id: string; result: "W" | "L" };

/** Tips that haven't kicked off yet, or are still unsettled. */
export async function getTodaysTips(limit = 3): Promise<TipCard[]> {
  return publicRead("getTodaysTips", [], async () => {
    await dbConnect();

    const tips = await Tip.find({ result: "pending" }).sort({ kickoffAt: 1 }).limit(limit).lean();

    return tips.map((tip) => ({
      id: String(tip._id),
      competition: tip.competition,
      kickoff: formatKickoffTime(tip.kickoffAt),
      fixture: tip.fixture,
      pick: tip.pick,
      odds: tip.odds,
      confidence: tip.confidence as TipConfidence,
    }));
  });
}

export async function getTrendingTips(limit = 3): Promise<TrendingTipCard[]> {
  return publicRead("getTrendingTips", [], async () => {
    await dbConnect();

    // Ranked by confidence, since there's no click-through data to rank by yet.
    const tips = await Tip.find({ result: "pending" })
      .sort({ confidence: -1, kickoffAt: 1 })
      .limit(limit)
      .lean();

    return tips.map((tip) => ({
      id: String(tip._id),
      fixture: tip.fixture,
      pick: tip.pick,
      odds: tip.odds,
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

    const settled = { result: { $in: ["won", "lost"] } } as const;

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

    const [summary] = await Tip.aggregate<{
      won: number;
      lost: number;
      profit: number;
    }>([
      { $match: { result: { $in: ["won", "lost", "void"] }, kickoffAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          won: { $sum: { $cond: [{ $eq: ["$result", "won"] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ["$result", "lost"] }, 1, 0] } },
          profit: {
            $sum: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$result", "won"] },
                    then: { $subtract: [{ $toDouble: "$odds" }, 1] },
                  },
                  { case: { $eq: ["$result", "lost"] }, then: -1 },
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

    const profit = summary?.profit ?? 0;
    const rounded = Math.round(profit * 10) / 10;

    return {
      winRate: `${Math.round((won / decided) * 100)}%`,
      units: `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)} units`,
      period: "Last 30 days",
      hasData: true,
    };
  });
}

/** Full tips list for the /tips page, newest first. */
export async function getAllTips(limit = 50) {
  return publicRead("getAllTips", [], async () => {
    await dbConnect();

    const tips = await Tip.find().sort({ kickoffAt: -1 }).limit(limit).lean();

    return tips.map((tip) => ({
      id: String(tip._id),
      competition: tip.competition,
      kickoff: formatKickoffTime(tip.kickoffAt),
      kickoffAt: tip.kickoffAt.toISOString(),
      fixture: tip.fixture,
      pick: tip.pick,
      odds: tip.odds,
      confidence: tip.confidence as TipConfidence,
      result: tip.result,
    }));
  });
}
