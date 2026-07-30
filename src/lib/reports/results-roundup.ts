import { SITE_TIMEZONE } from "@/lib/constants";
import type { MatchFacts } from "@/lib/reports/match-report";

/**
 * One article summarising every match that finished on a given day.
 *
 * This is where most results belong. With no scorers available from the free tier, an
 * individual report on a routine 1-0 would be three near-identical sentences — but the
 * same result is genuinely useful as a line in a round-up, grouped by competition.
 * Between them, the round-up covers everything and the standalone reports
 * (`isReportWorthy`) cover the results that had something to say.
 */

const longDayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: SITE_TIMEZONE,
});

export type GeneratedRoundup = {
  title: string;
  excerpt: string;
  body: string;
};

function groupByCompetition(matches: MatchFacts[]): Map<string, MatchFacts[]> {
  const grouped = new Map<string, MatchFacts[]>();

  for (const match of matches) {
    grouped.set(match.competition, [...(grouped.get(match.competition) ?? []), match]);
  }

  // Biggest fixture lists first, so the busiest competition leads the article.
  return new Map(
    [...grouped].sort(([, a], [, b]) => b.length - a.length || 0),
  );
}

/** "Arsenal 2-1 Chelsea" — plain, scannable, and all the data supports. */
function scoreLine(match: MatchFacts): string {
  return `${match.home} ${match.homeScore}-${match.awayScore} ${match.away}`;
}

/**
 * Builds the round-up. Returns null when there's nothing to report, so callers don't
 * publish an empty article on a quiet day.
 */
export function generateResultsRoundup(
  matches: MatchFacts[],
  day: Date,
): GeneratedRoundup | null {
  if (matches.length === 0) return null;

  const dayLabel = longDayFormatter.format(day);
  const grouped = groupByCompetition(matches);
  const totalGoals = matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);

  const opening =
    matches.length === 1
      ? `One match finished on ${dayLabel}.`
      : `${matches.length} matches finished on ${dayLabel} across ` +
        `${grouped.size === 1 ? "one competition" : `${grouped.size} competitions`}, ` +
        `producing ${totalGoals} ${totalGoals === 1 ? "goal" : "goals"}.`;

  // One block per competition: a heading line, then a result per line. Deliberately
  // plain — the value here is that it's complete and correct, not that it's lyrical.
  const blocks = [...grouped].map(([competition, fixtures]) => {
    const lines = fixtures
      .slice()
      .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())
      .map(scoreLine);

    return `${competition}\n${lines.join("\n")}`;
  });

  const biggestWin = matches.reduce((best, match) => {
    const margin = Math.abs(match.homeScore - match.awayScore);
    return margin > Math.abs(best.homeScore - best.awayScore) ? match : best;
  });

  const closing: string[] = [];
  const biggestMargin = Math.abs(biggestWin.homeScore - biggestWin.awayScore);

  if (biggestMargin >= 3) {
    const winner = biggestWin.homeScore > biggestWin.awayScore ? biggestWin.home : biggestWin.away;
    const loser = biggestWin.homeScore > biggestWin.awayScore ? biggestWin.away : biggestWin.home;
    closing.push(
      `The day's widest margin came from ${winner}, who beat ${loser} by ${biggestMargin} goals.`,
    );
  }

  return {
    title: `Results round-up: ${dayLabel}`,
    excerpt: opening,
    body: [opening, ...blocks, ...closing].join("\n\n"),
  };
}
