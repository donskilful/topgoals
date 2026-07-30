import { dbConnect } from "@/lib/db";
import { StandingRow } from "@/lib/models/standing-row";
import {
  fetchStandings,
  isPublishableTable,
  remainingRequests,
  STANDINGS_COMPETITIONS,
  FootballDataError,
} from "@/lib/football-data";
import { revalidatePath } from "next/cache";

/**
 * Pulls league tables from football-data.org into the StandingRow collection.
 *
 * Before this existed the table was hand-maintained, which meant it sat on the homepage
 * beside automatically-updating live scores looking equally live, and quietly went stale
 * the moment nobody remembered to edit it. A wrong league table next to betting tips is
 * worse than no table.
 *
 * ## How rows are matched
 *
 * On `{competition, team}`, never on position. Positions reshuffle on almost every sync,
 * so keying on them produced duplicate-key errors as soon as two teams swapped places.
 * Teams that drop out of a table entirely (a new season's promoted/relegated set) are
 * deleted afterwards, so a table can shrink as well as grow.
 *
 * ## Rate limit
 *
 * One request per competition, sharing a 10-request/minute budget with the score sync. Six
 * competitions is a six-request burst; the score sync adds one, so a run that collides with
 * it uses seven of ten. The provider client self-throttles from its own response headers, so
 * adding competitions degrades into waiting rather than into 429s — but past about eight the
 * two crons would need staggering.
 */

export type StandingsSyncResult = {
  competitions: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  /** Competitions deliberately left alone, with why — usually a season not yet started. */
  skipped: string[];
  /** Competitions that failed, by name — one failure never stops the others. */
  failed: string[];
};

/**
 * Stale-index guard.
 *
 * The unique index used to be `{competition, pos}`. Mongoose only *declares* indexes; it
 * never drops ones that are no longer declared, so on any database created before that
 * change the old unique index is still live and would reject a legitimate reshuffle.
 * `syncIndexes()` drops it. Runs once per process, not per sync — it's a schema
 * operation, not a per-run one.
 */
let indexesSynced = false;

async function ensureIndexes() {
  if (indexesSynced) return;

  try {
    await StandingRow.syncIndexes();
    indexesSynced = true;
  } catch (error) {
    // Don't fail the sync over this: a fresh database already has the right indexes, and
    // the write below will surface a genuine problem clearly enough.
    console.warn("Could not sync StandingRow indexes:", error);
  }
}

export async function syncStandings(): Promise<StandingsSyncResult> {
  await dbConnect();
  await ensureIndexes();

  const result: StandingsSyncResult = {
    competitions: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    skipped: [],
    failed: [],
  };

  for (const competition of STANDINGS_COMPETITIONS) {
    try {
      const standings = await fetchStandings(competition.code);
      const publishable = isPublishableTable(standings);

      // Leave whatever is stored alone rather than replacing a good table — or an
      // editor's hand-built one — with something the provider isn't ready to give us.
      if (!publishable.ok) {
        console.warn(`${competition.name}: skipped because ${publishable.reason}.`);
        result.skipped.push(`${competition.name} (${publishable.reason})`);
        continue;
      }

      const table = standings.rows;

      const existing = await StandingRow.find({ competition: competition.name })
        .select("team pos played goalsFor goalsAgainst points qualifying")
        .lean();

      const byTeam = new Map(existing.map((row) => [row.team, row]));

      for (const row of table) {
        const current = byTeam.get(row.team);

        if (!current) {
          await StandingRow.create({
            competition: competition.name,
            ...row,
            autoSynced: true,
            lastSyncedAt: new Date(),
          });
          result.created += 1;
          continue;
        }

        // Skip writes that would change nothing — a table is re-fetched every 15 minutes
        // but only actually moves when a match finishes.
        const changed =
          current.pos !== row.pos ||
          current.played !== row.played ||
          current.goalsFor !== row.goalsFor ||
          current.goalsAgainst !== row.goalsAgainst ||
          current.points !== row.points ||
          current.qualifying !== row.qualifying;

        if (!changed) {
          result.unchanged += 1;
          continue;
        }

        await StandingRow.updateOne(
          { competition: competition.name, team: row.team },
          { $set: { ...row, autoSynced: true, lastSyncedAt: new Date() } },
        );
        result.updated += 1;
      }

      // Teams no longer in the table — promotion, relegation, a new season's line-up.
      const feedTeams = new Set(table.map((row) => row.team));
      const departed = existing.filter((row) => !feedTeams.has(row.team));

      if (departed.length > 0) {
        await StandingRow.deleteMany({
          competition: competition.name,
          team: { $in: departed.map((row) => row.team) },
        });
        result.removed += departed.length;
      }

      result.competitions += 1;
    } catch (error) {
      // A rate limit is expected and transient — the next run picks the table up 15
      // minutes later. Counting it as a failure would make the cron report a false alarm
      // for something working exactly as designed, so it's recorded as a skip.
      if (error instanceof FootballDataError && error.status === 429) {
        console.warn(`${competition.name}: ${error.message}`);
        result.skipped.push(`${competition.name} (rate limited, will retry next run)`);
        // Every remaining competition would hit the same limit — stop rather than
        // burning the run on certain failures.
        break;
      }

      result.failed.push(competition.name);

      if (error instanceof FootballDataError) {
        console.warn(`${competition.name} standings skipped:`, error.message);
      } else {
        console.error(`${competition.name} standings failed:`, error);
      }
    }
  }

  if (result.created > 0 || result.updated > 0 || result.removed > 0) {
    try {
      for (const path of ["/", "/scores"]) revalidatePath(path);
      revalidatePath("/admin/standings");
    } catch {
      // Outside a request context (scripts, tests) — not worth failing a sync over.
    }
  }

  console.log(
    `Standings sync: ${result.competitions}/${STANDINGS_COMPETITIONS.length} competitions, ` +
      `${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged, ` +
      `${result.removed} removed, ${result.skipped.length} skipped. ` +
      `Requests left this minute: ${remainingRequests() ?? "unknown"}.`,
  );

  return result;
}
