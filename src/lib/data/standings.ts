import { dbConnect } from "@/lib/db";
import { StandingRow } from "@/lib/models/standing-row";
import { formatGoalDifference, DEFAULT_COMPETITION } from "@/lib/constants";
import { publicRead } from "@/lib/data/public-read";

export type StandingsRowCard = {
  id: string;
  pos: number;
  team: string;
  played: number;
  gd: string;
  points: number;
  qualifying: boolean;
  form: string[];
};

/**
 * One competition's table.
 *
 * The `competition` filter matters more than it looks: this used to query every row and
 * sort by position, which was fine while only the Premier League existed and became
 * wrong the moment standings covered five leagues — five different teams all at position
 * 1, interleaved into one nonsense table.
 */
export async function getStandings(
  { competition = DEFAULT_COMPETITION, limit = 5 }: { competition?: string; limit?: number } = {},
): Promise<StandingsRowCard[]> {
  return publicRead("getStandings", [], async () => {
    await dbConnect();

    const rows = await StandingRow.find({ competition }).sort({ pos: 1 }).limit(limit).lean();

    return rows.map((row) => ({
      id: String(row._id),
      pos: row.pos,
      team: row.team,
      played: row.played,
      gd: formatGoalDifference(row.goalsFor, row.goalsAgainst),
      points: row.points,
      qualifying: row.qualifying,
      form: row.form ?? [],
    }));
  });
}

/**
 * Which competitions actually have a table, for the league switcher.
 *
 * Read from the data rather than from the sync's configured list, so a league is only
 * offered when there are rows behind it — a competition whose season hasn't started, or
 * one added by hand in the CMS, is then handled without touching this code.
 */
export async function getStandingsCompetitions(): Promise<string[]> {
  return publicRead("getStandingsCompetitions", [], async () => {
    await dbConnect();

    const competitions = await StandingRow.distinct("competition");

    // Primary league first when present, then alphabetical, so the order is stable
    // between renders.
    return competitions.sort((a, b) => {
      if (a === DEFAULT_COMPETITION) return -1;
      if (b === DEFAULT_COMPETITION) return 1;
      return a.localeCompare(b);
    });
  });
}

export type LeagueTable = { competition: string; rows: StandingsRowCard[] };

/**
 * Every league table in one go, for the /scores switcher.
 *
 * Fetched together and sent to the client as props so the page stays **static HTML** and
 * switching leagues is instant with no request. A `?league=` query param would have been
 * less code but would turn the page into a per-request server render, and a fast static
 * first paint on a weak connection is the whole point of this site. Five tables of twenty
 * rows is a few kB of JSON — cheaper than one round trip.
 */
export async function getAllLeagueTables(limit = 20): Promise<LeagueTable[]> {
  return publicRead("getAllLeagueTables", [], async () => {
    await dbConnect();

    const competitions = await StandingRow.distinct("competition");

    const tables = await Promise.all(
      competitions.map(async (competition) => {
        const rows = await StandingRow.find({ competition }).sort({ pos: 1 }).limit(limit).lean();

        return {
          competition,
          // Whether the feed is keeping this table current, used only for ordering below.
          live: rows.some((row) => row.autoSynced),
          rows: rows.map((row) => ({
            id: String(row._id),
            pos: row.pos,
            team: row.team,
            played: row.played,
            gd: formatGoalDifference(row.goalsFor, row.goalsAgainst),
            points: row.points,
            qualifying: row.qualifying,
            form: row.form ?? [],
          })),
        };
      }),
    );

    return tables
      .filter((table) => table.rows.length > 0)
      .sort((a, b) => {
        // Tables the feed is actually updating come first, so the tab that opens by
        // default is never a stale one. Out of season the primary league has no live
        // table, and leading with last season's leftovers would present them as current.
        if (a.live !== b.live) return a.live ? -1 : 1;
        if (a.competition === DEFAULT_COMPETITION) return -1;
        if (b.competition === DEFAULT_COMPETITION) return 1;
        return a.competition.localeCompare(b.competition);
      })
      .map(({ competition, rows }) => ({ competition, rows }));
  });
}

/**
 * The table for the homepage widget, with its competition name.
 *
 * Prefers a competition the feed is actually keeping current, falling back to the primary
 * league. That matters because the sync deliberately refuses to publish a table before
 * its season starts, so between May and mid-August the primary league has no live table —
 * and whatever sits in that slot (old seed rows, last season's leftovers) would otherwise
 * be presented as the current standings. Showing a league that *is* being updated, clearly
 * labelled, beats showing a stale one that looks current.
 */
export async function getPrimaryLeagueTable(
  limit = 5,
): Promise<{ competition: string; rows: StandingsRowCard[] } | null> {
  return publicRead("getPrimaryLeagueTable", null, async () => {
    await dbConnect();

    const liveCompetition = await StandingRow.findOne({ autoSynced: true })
      .select("competition")
      .lean();

    const competition = liveCompetition?.competition ?? DEFAULT_COMPETITION;

    const rows = await StandingRow.find({ competition }).sort({ pos: 1 }).limit(limit).lean();

    if (rows.length === 0) return null;

    return {
      competition,
      rows: rows.map((row) => ({
        id: String(row._id),
        pos: row.pos,
        team: row.team,
        played: row.played,
        gd: formatGoalDifference(row.goalsFor, row.goalsAgainst),
        points: row.points,
        qualifying: row.qualifying,
        form: row.form ?? [],
      })),
    };
  });
}
