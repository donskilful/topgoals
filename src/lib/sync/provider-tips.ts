import type { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";
import { Match } from "@/lib/models/match";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderTip } from "@/lib/providers/types";
import { parseMarket } from "@/lib/tips/markets";
import { sameTeam } from "@/lib/tips/teams";
import { getQualifiedProviders } from "@/lib/data/providers";
import { getAutomationActor } from "@/lib/automation-actor";
import { logAudit } from "@/lib/audit";
import { revalidateContent } from "@/lib/actions/revalidate";

/**
 * Ingests published picks from tips providers as tips of our own.
 *
 * ## The four things every pick must clear
 *
 * A pick is only stored if all of these hold. Each one exists because failing it would put
 * something on the site we couldn't stand behind:
 *
 * 1. **It resolves to exactly one fixture we already hold.** Providers cover dozens of leagues;
 *    we hold thirteen competitions. A pick on a fixture we don't have could never be settled, so
 *    it would sit pending forever, and a pick matching two fixtures means we don't know which was
 *    tipped.
 * 2. **Its selection parses into a market we can grade.** Storing a pick we can't settle is how a
 *    track record quietly fills with un-graded tips that flatter it by omission.
 * 3. **The match hasn't started.** A selection whose match is under way isn't a tip any more.
 * 4. **We don't already have it.** The provider republishes the same pick across several of its
 *    market pages, and runs twice a day.
 *
 * ## Why nothing is published on day one
 *
 * Ingested picks are stored unpublished and stay that way until the provider has earned a
 * verified record on our own settled results — see `src/lib/data/providers.ts`. There's no
 * probability figure anywhere on the pages we read, so "only take the high-confidence ones"
 * cannot be decided at ingestion; it can only be decided in arrears, from results. Publishing
 * unproven picks and quietly hoping would be the easy path and the wrong one.
 */

/**
 * How far a provider's stated kick-off may sit from ours and still be the same fixture.
 *
 * Generous, because the provider's timestamps carry no timezone (see `parseHint` in the adapter)
 * and could be out by any single-digit number of hours. Being generous is safe here: the window
 * only gathers candidates, and a pick matching more than one is discarded rather than guessed at.
 * The teams do the actual identifying.
 */
const KICKOFF_TOLERANCE_HOURS = 18;

export type ProviderIngestResult = {
  provider: string;
  /** Picks read off the provider's pages. */
  scraped: number;
  /** New tips stored. */
  stored: number;
  published: number;
  /** Already held, from an earlier run or another of the provider's pages. */
  duplicates: number;
  /** Discarded, grouped by why — a provider whose picks all fail one check is a bug, not bad luck. */
  rejected: Record<string, number>;
  failed: number;
};

type CandidateMatch = {
  _id: Types.ObjectId;
  competition: string;
  home: string;
  away: string;
  kickoffAt: Date;
  status: string;
};

/**
 * Finds the one fixture a scraped pick refers to, or nothing.
 *
 * Uses the provider's kick-off only to narrow the search, then identifies by team name — the
 * same comparison the settler uses, so a pick this accepts is one the settler can grade. Either
 * orientation is allowed, since a provider listing the away side first would otherwise be missed
 * and the selection text names its team explicitly anyway.
 */
async function resolveFixture(tip: ProviderTip): Promise<CandidateMatch | null> {
  const tolerance = KICKOFF_TOLERANCE_HOURS * 60 * 60 * 1000;

  const candidates = (await Match.find({
    kickoffAt: {
      $gte: new Date(tip.kickoffHint.getTime() - tolerance),
      $lte: new Date(tip.kickoffHint.getTime() + tolerance),
    },
  }).lean()) as CandidateMatch[];

  const matches = candidates.filter((match) => {
    const pairs = (a: string, b: string) => sameTeam(a, match.home) && sameTeam(b, match.away);
    return pairs(tip.home, tip.away) || pairs(tip.away, tip.home);
  });

  // Two plausible fixtures means we don't know which was tipped.
  return matches.length === 1 ? matches[0] : null;
}

export async function syncProviderTips(): Promise<ProviderIngestResult[]> {
  await dbConnect();

  const actor = await getAutomationActor();
  const qualified = await getQualifiedProviders();
  const results: ProviderIngestResult[] = [];

  let storedAnyPublished = false;

  for (const provider of PROVIDERS) {
    const result: ProviderIngestResult = {
      provider: provider.name,
      scraped: 0,
      stored: 0,
      published: 0,
      duplicates: 0,
      rejected: {},
      failed: 0,
    };

    const reject = (reason: string) => {
      result.rejected[reason] = (result.rejected[reason] ?? 0) + 1;
    };

    try {
      const scraped = await provider.fetchTips();
      result.scraped = scraped.length;

      // A provider only publishes once it has earned it. Decided per run, so a record that
      // slips stops publishing on the next cycle without anyone intervening.
      const publish = qualified.has(provider.name);

      for (const tip of scraped) {
        try {
          if (!parseMarket(tip.pick)) {
            reject("selection can't be graded from a scoreline");
            continue;
          }

          const match = await resolveFixture(tip);

          if (!match) {
            reject("no single matching fixture in our data");
            continue;
          }

          if (match.kickoffAt.getTime() <= Date.now()) {
            reject("match already under way");
            continue;
          }

          // The same pick can appear on several of the provider's market pages, and the job runs
          // twice daily. Matched on fixture and selection rather than on the provider's URL,
          // which differs between those pages for one identical pick.
          const existing = await Tip.findOne({
            "source.name": provider.name,
            matchId: match._id,
            pick: tip.pick,
          }).lean();

          if (existing) {
            result.duplicates += 1;
            continue;
          }

          const created = await Tip.create({
            competition: match.competition,
            // Our own fixture string and kick-off, not the provider's: theirs spells clubs
            // differently and its timestamps have no timezone.
            fixture: `${match.home} v ${match.away}`,
            kickoffAt: match.kickoffAt,
            pick: tip.pick,
            // Left unset rather than invented — the provider published neither.
            odds: null,
            confidence: null,
            result: "pending",
            matchId: match._id,
            authorId: actor.id,
            source: { name: provider.name, url: tip.url },
            published: publish,
          });

          result.stored += 1;
          if (publish) {
            result.published += 1;
            storedAnyPublished = true;
          }

          await logAudit({
            actor,
            action: "create",
            entityType: "Tip",
            entityId: String(created._id),
            summary:
              `Ingested ${created.fixture} — ${created.pick} from ${provider.name}` +
              `${publish ? "" : " (tracked, not published)"}`,
            before: null,
            after: created.toObject(),
          });
        } catch (error) {
          result.failed += 1;
          console.error(`Could not ingest "${tip.home} v ${tip.away} — ${tip.pick}":`, error);
        }
      }
    } catch (error) {
      result.failed += 1;
      console.error(`Could not read ${provider.name}:`, error);
    }

    const rejected = Object.entries(result.rejected)
      .map(([reason, count]) => `${count} ${reason}`)
      .join("; ");

    console.log(
      `${provider.name}: ${result.scraped} scraped, ${result.stored} stored ` +
        `(${result.published} published), ${result.duplicates} already held` +
        `${rejected ? `, rejected — ${rejected}` : ""}` +
        `${result.failed > 0 ? `, ${result.failed} failed` : ""}.`,
    );

    results.push(result);
  }

  // Only a published tip changes anything a reader sees.
  if (storedAnyPublished) revalidateContent("tip", "/admin/tips");

  return results;
}
