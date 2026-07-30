import { dbConnect } from "@/lib/db";
import { StandingRow } from "@/lib/models/standing-row";
import { formatGoalDifference } from "@/lib/constants";
import { publicRead } from "@/lib/data/public-read";

export type StandingsRowCard = {
  id: string;
  pos: number;
  team: string;
  played: number;
  gd: string;
  points: number;
  qualifying: boolean;
};

export async function getStandings(limit = 5): Promise<StandingsRowCard[]> {
  return publicRead("getStandings", [], async () => {
    await dbConnect();

    const rows = await StandingRow.find().sort({ pos: 1 }).limit(limit).lean();

    return rows.map((row) => ({
      id: String(row._id),
      pos: row.pos,
      team: row.team,
      played: row.played,
      gd: formatGoalDifference(row.goalsFor, row.goalsAgainst),
      points: row.points,
      qualifying: row.qualifying,
    }));
  });
}
