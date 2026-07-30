import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { Match } from "@/lib/models/match";
import { generateMatchReport, isReportWorthy, type MatchFacts } from "@/lib/reports/match-report";
import { generateResultsRoundup } from "@/lib/reports/results-roundup";
import { getAutomationActor } from "@/lib/automation-actor";
import { logAudit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { revalidateContent } from "@/lib/actions/revalidate";
import { SITE_TIMEZONE } from "@/lib/constants";

/**
 * Publishes match reports and a daily results round-up.
 *
 * Reads finished matches straight out of our own database — the score sync has already
 * put them there — so this costs **zero** provider requests and can't be rate-limited.
 *
 * Everything is written in plain JavaScript from facts we hold (see
 * `src/lib/reports/match-report.ts` for why that's sound where drafting news from a
 * feed's prose was not). No API key, no per-article cost.
 *
 * Dedupe works through `Article.sourceGuids`, the same field the feed pipeline used:
 * a per-match report is tagged `match:<externalId>` and a round-up `roundup:<date>`. So
 * a match is reported once no matter how often this runs, and the round-up for a day is
 * written once.
 */

/** Bounded so a busy weekend can't publish thirty stubs at once. */
const MAX_REPORTS_PER_RUN = 6;

/**
 * How far back to consider results.
 *
 * Wide enough to catch up after a failed run or a deploy gap, and harmless because
 * anything already reported is skipped.
 */
const LOOKBACK_HOURS = 36;

export type ReportSyncResult = {
  finished: number;
  /** Matches skipped because a report already exists. */
  alreadyReported: number;
  reportsPublished: number;
  roundupPublished: boolean;
  failed: number;
};

/** Numeric scores, since matches store them as display strings ("2", "–"). */
function toFacts(match: {
  competition: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  halfTimeHome?: number | null;
  halfTimeAway?: number | null;
  matchday?: number | null;
  kickoffAt: Date;
}): MatchFacts | null {
  const homeScore = Number(match.homeScore);
  const awayScore = Number(match.awayScore);

  // A finished match with a non-numeric score is malformed — never guess at it.
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) return null;

  return {
    competition: match.competition,
    home: match.home,
    away: match.away,
    homeScore,
    awayScore,
    halfTimeHome: match.halfTimeHome ?? null,
    halfTimeAway: match.halfTimeAway ?? null,
    matchday: match.matchday ?? null,
    kickoffAt: match.kickoffAt,
  };
}

/** The site-timezone calendar day a kick-off belongs to, as YYYY-MM-DD. */
function siteDay(date: Date): string {
  // en-CA gives ISO-ordered parts, and the timezone is pinned so a late kick-off is
  // filed under the day readers would call it.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: SITE_TIMEZONE,
  }).format(date);
}

export async function syncReports(): Promise<ReportSyncResult> {
  await dbConnect();

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  const matches = await Match.find({
    status: "finished",
    kickoffAt: { $gte: since },
    // Hand-added fixtures have no provider id, so there's no stable key to dedupe a
    // report against. The CMS covers those.
    externalId: { $ne: null },
  })
    .sort({ kickoffAt: -1 })
    .lean();

  const result: ReportSyncResult = {
    finished: matches.length,
    alreadyReported: 0,
    reportsPublished: 0,
    roundupPublished: false,
    failed: 0,
  };

  if (matches.length === 0) return result;

  const matchKeys = matches.map((match) => `match:${match.externalId}`);
  const days = [...new Set(matches.map((match) => siteDay(match.kickoffAt)))];
  const roundupKeys = days.map((day) => `roundup:${day}`);

  const covered = await Article.find({ sourceGuids: { $in: [...matchKeys, ...roundupKeys] } })
    .select("sourceGuids")
    .lean();

  const coveredKeys = new Set(covered.flatMap((article) => article.sourceGuids));

  const actor = await getAutomationActor();

  // ---- Standalone reports for results worth their own article ----

  const candidates = matches
    .map((match) => ({ match, facts: toFacts(match) }))
    .filter((entry): entry is { match: (typeof matches)[number]; facts: MatchFacts } =>
      entry.facts !== null,
    );

  const unreported = candidates.filter(
    ({ match }) => !coveredKeys.has(`match:${match.externalId}`),
  );

  result.alreadyReported = candidates.length - unreported.length;

  const worthy = unreported.filter(({ facts }) => isReportWorthy(facts)).slice(0, MAX_REPORTS_PER_RUN);

  for (const { match, facts } of worthy) {
    try {
      const report = generateMatchReport(facts);

      const created = await Article.create({
        category: "News",
        title: report.title,
        slug: await uniqueSlug(Article, report.title),
        excerpt: report.excerpt,
        body: report.body,
        image: null,
        publishedAt: match.kickoffAt,
        authorId: actor.id,
        autoGenerated: true,
        // No `sources` entry: nothing here is derived from another publisher's
        // reporting, so there is nothing to attribute. The data came from the
        // football-data.org feed we already licence.
        sources: [],
        sourceGuids: [`match:${match.externalId}`],
      });

      await logAudit({
        actor,
        action: "create",
        entityType: "Article",
        entityId: String(created._id),
        summary: `Auto-published match report “${created.title}”`,
        after: created,
      });

      result.reportsPublished += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Could not write report for ${match.home} v ${match.away}:`, error);
    }
  }

  // ---- Daily round-up ----

  // Yesterday rather than today: a round-up written mid-afternoon would miss the
  // evening kick-offs and then never be rewritten, because the day is already covered.
  const yesterday = siteDay(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (!coveredKeys.has(`roundup:${yesterday}`)) {
    const dayMatches = candidates
      .filter(({ match }) => siteDay(match.kickoffAt) === yesterday)
      .map(({ facts }) => facts);

    const roundup = dayMatches.length > 0 ? generateResultsRoundup(dayMatches, dayMatches[0].kickoffAt) : null;

    if (roundup) {
      try {
        const created = await Article.create({
          category: "News",
          title: roundup.title,
          slug: await uniqueSlug(Article, roundup.title),
          excerpt: roundup.excerpt,
          body: roundup.body,
          image: null,
          publishedAt: new Date(),
          authorId: actor.id,
          autoGenerated: true,
          sources: [],
          sourceGuids: [`roundup:${yesterday}`],
        });

        await logAudit({
          actor,
          action: "create",
          entityType: "Article",
          entityId: String(created._id),
          summary: `Auto-published results round-up for ${yesterday}`,
          after: created,
        });

        result.roundupPublished = true;
      } catch (error) {
        result.failed += 1;
        console.error(`Could not write the round-up for ${yesterday}:`, error);
      }
    }
  }

  if (result.reportsPublished > 0 || result.roundupPublished) {
    revalidateContent("article", "/admin/articles");
  }

  return result;
}
