import { dbConnect } from "@/lib/db";
import { Match } from "@/lib/models/match";
import { fetchMatches } from "@/lib/football-data";
import { revalidateContent } from "@/lib/actions/revalidate";

export type SyncResult = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  skippedManual: number;
};

/**
 * Pulls the current fixture window from football-data.org into the Match collection.
 *
 * Rules that matter:
 *  - Matches are matched on `externalId`, so repeated runs update rows rather than
 *    duplicating them.
 *  - A match a human has edited (`manualOverride`) is left completely alone. Feeds
 *    get scores wrong, and on a betting site a corrected score must not be silently
 *    reverted by the next poll.
 *  - Matches added by hand (no `externalId`) are never touched, so the CMS still
 *    works for competitions the free tier doesn't cover.
 *  - Nothing is deleted here. Old fixtures ageing out of the window stay until
 *    someone removes them, so a provider outage can't wipe the ticker.
 */
/**
 * Stale-index guard.
 *
 * `externalId` was indexed unique+sparse, which doesn't do what it looks like it does when the
 * field defaults to null — see the model. Mongoose only ever *declares* indexes; it never drops
 * ones that have changed, so on any database created before the fix the old index is still live
 * and still rejects the second hand-added fixture. `syncIndexes()` replaces it.
 *
 * Runs once per process rather than per sync: it's a schema operation, not a per-run one.
 */
let indexesSynced = false;

async function ensureIndexes() {
  if (indexesSynced) return;

  try {
    await Match.syncIndexes();
    indexesSynced = true;
  } catch (error) {
    // Never fail a sync over this — a fresh database already has the right indexes, and a real
    // write problem will surface on its own below.
    console.warn("Could not sync Match indexes:", error);
  }
}

export async function syncMatches(): Promise<SyncResult> {
  const feed = await fetchMatches();
  await dbConnect();
  await ensureIndexes();

  const result: SyncResult = {
    fetched: feed.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    skippedManual: 0,
  };

  if (feed.length === 0) return result;

  const existing = await Match.find({ externalId: { $in: feed.map((m) => m.externalId) } })
    .select(
      "externalId manualOverride homeScore awayScore status meta kickoffAt halfTimeHome halfTimeAway",
    )
    .lean();

  const byExternalId = new Map(existing.map((doc) => [doc.externalId, doc]));

  for (const match of feed) {
    const current = byExternalId.get(match.externalId);

    if (!current) {
      await Match.create({ ...match, lastSyncedAt: new Date() });
      result.created += 1;
      continue;
    }

    if (current.manualOverride) {
      result.skippedManual += 1;
      continue;
    }

    // Only write when something a reader would notice has actually changed —
    // pointless writes would churn the audit-free update timestamps every minute.
    const changed =
      current.homeScore !== match.homeScore ||
      current.awayScore !== match.awayScore ||
      current.status !== match.status ||
      current.meta !== match.meta ||
      current.kickoffAt?.getTime() !== match.kickoffAt.getTime() ||
      // Arrives at the interval, well after the full-time score is already set, and the
      // report templates depend on it — so it has to count as a change in its own right.
      current.halfTimeHome !== match.halfTimeHome ||
      current.halfTimeAway !== match.halfTimeAway;

    if (!changed) {
      result.unchanged += 1;
      continue;
    }

    await Match.updateOne(
      { externalId: match.externalId },
      { $set: { ...match, lastSyncedAt: new Date() } },
    );
    result.updated += 1;
  }

  // Only bust the caches if something actually moved.
  if (result.created > 0 || result.updated > 0) {
    revalidateContent("match", "/admin/matches");
  }

  return result;
}
