import { dbConnect } from "@/lib/db";
import { Match } from "@/lib/models/match";
import type { MatchStatus } from "@/lib/constants";

export type TickerMatchCard = {
  id: string;
  competition: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  status: MatchStatus;
  meta: string;
};

const STATUS_ORDER: Record<MatchStatus, number> = { live: 0, upcoming: 1, finished: 2 };

export async function getTickerMatches(limit = 12): Promise<TickerMatchCard[]> {
  await dbConnect();

  const matches = await Match.find().sort({ kickoffAt: 1 }).limit(limit).lean();

  return matches
    .map((match) => ({
      id: String(match._id),
      competition: match.competition,
      home: match.home,
      away: match.away,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status as MatchStatus,
      meta: match.meta,
    }))
    // Live matches lead the ticker, then upcoming, then finished — sorting in JS
    // because the order is by meaning, not by any stored field.
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}
