import { SITE_TIMEZONE } from "@/lib/constants";

/**
 * Writes match reports in plain JavaScript — no LLM, no API cost.
 *
 * This works where LLM drafting was needed for news, and it's worth being clear about
 * why the two cases differ:
 *
 *  - A news feed gives us *someone else's prose*. Turning prose into different prose
 *    without a language model means rearranging their words, which is a derivative of
 *    their writing however far it drifts. That's the case this file cannot serve.
 *  - A match gives us *structured facts we already hold* — teams, scoreline, half-time
 *    score, competition, matchday. Facts aren't copyrightable, and the sentences below
 *    are ours. So the output is original, free, instant and incapable of hallucinating.
 *
 * This is what wire services have done for results and earnings for years.
 *
 * ## The hard constraint
 *
 * football-data.org's free tier returns **no scorers, no bookings, no referees** — only
 * the scoreline, the half-time score, the competition and the matchday. Every sentence
 * here is built from exactly that. Nothing infers a narrative the data can't support:
 * no "dominant display", no "under pressure", no naming who scored. A brief, true report
 * is the goal; anything richer needs a paid tier (see TODO.md).
 *
 * Variation comes from picking a phrasing by a hash of the fixture, so reports don't all
 * read identically, and the same match always produces the same wording.
 */

export type MatchFacts = {
  competition: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  matchday: number | null;
  kickoffAt: Date;
};

export type GeneratedReport = {
  title: string;
  excerpt: string;
  body: string;
};

/** Stable per-fixture hash, so phrasing varies between matches but never within one. */
function seed(facts: MatchFacts): number {
  const key = `${facts.home}|${facts.away}|${facts.kickoffAt.toISOString()}`;
  let value = 0x811c9dc5;

  for (let index = 0; index < key.length; index += 1) {
    value ^= key.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }

  return value >>> 0;
}

/** Deterministic pick from a list of alternatives. */
function pick<T>(options: readonly T[], value: number, salt: number): T {
  return options[(value >>> salt) % options.length];
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  timeZone: SITE_TIMEZONE,
});

/** How the match ended, in the terms the data actually supports. */
type Shape =
  | "draw"
  | "narrow"
  | "comfortable"
  | "emphatic"
  | "comeback"
  | "held-on"
  | "second-half";

function describeShape(facts: MatchFacts): Shape {
  const { homeScore, awayScore, halfTimeHome, halfTimeAway } = facts;
  const margin = Math.abs(homeScore - awayScore);
  const hasHalfTime = typeof halfTimeHome === "number" && typeof halfTimeAway === "number";

  if (hasHalfTime) {
    const halfTimeLeader = Math.sign(halfTimeHome - halfTimeAway);
    const fullTimeLeader = Math.sign(homeScore - awayScore);

    // Losing at the break and winning at the end is the one genuinely dramatic thing
    // half-time data can prove.
    if (halfTimeLeader !== 0 && fullTimeLeader !== 0 && halfTimeLeader !== fullTimeLeader) {
      return "comeback";
    }

    // Goalless or level at the break, decided after it.
    if (halfTimeLeader === 0 && fullTimeLeader !== 0) return "second-half";

    // Led at the break and still only just ahead at the end.
    if (halfTimeLeader === fullTimeLeader && margin === 1) return "held-on";
  }

  if (homeScore === awayScore) return "draw";
  if (margin === 1) return "narrow";
  if (margin === 2) return "comfortable";
  return "emphatic";
}

/**
 * Verb for a win, varied by fixture but scaled to the margin.
 *
 * Kept in step with the headline: a 4-0 titled "sweep aside" opened with "got the better
 * of", which understates a rout and reads as though the two sentences describe different
 * matches.
 */
function winVerb(value: number, shape: Shape): string {
  if (shape === "emphatic") return pick(["beat", "overpowered", "outclassed"], value, 3);
  if (shape === "narrow" || shape === "held-on") {
    return pick(["edged", "beat", "saw off"], value, 3);
  }
  return pick(["beat", "saw off", "got the better of", "overcame"], value, 3);
}

function buildTitle(facts: MatchFacts, shape: Shape, value: number): string {
  const { home, away, homeScore, awayScore } = facts;
  const homeWon = homeScore > awayScore;
  const winner = homeWon ? home : away;
  const loser = homeWon ? away : home;
  const scoreline = `${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}`;

  if (shape === "draw") {
    return homeScore === 0
      ? `${home} and ${away} play out goalless draw`
      : `${home} and ${away} share ${homeScore === 1 ? "the points" : `a ${homeScore}-${awayScore} draw`}`;
  }

  switch (shape) {
    case "comeback":
      return `${winner} come from behind to beat ${loser} ${scoreline}`;
    case "second-half":
      return `${winner} break deadlock after the break to beat ${loser} ${scoreline}`;
    case "held-on":
      return `${winner} hold on to beat ${loser} ${scoreline}`;
    case "emphatic":
      return `${winner} ${pick(["run riot against", "thrash", "sweep aside"], value, 7)} ${loser} ${scoreline}`;
    default:
      return `${winner} ${winVerb(value, shape)} ${loser} ${scoreline}`;
  }
}

/** The opening sentence: who won, by what, where. */
function openingSentence(facts: MatchFacts, shape: Shape, value: number): string {
  const { home, away, homeScore, awayScore, competition } = facts;
  const day = dayFormatter.format(facts.kickoffAt);
  const homeWon = homeScore > awayScore;
  const winner = homeWon ? home : away;
  const loser = homeWon ? away : home;
  const high = Math.max(homeScore, awayScore);
  const low = Math.min(homeScore, awayScore);

  if (shape === "draw") {
    return homeScore === 0
      ? `${home} and ${away} drew a blank in their ${competition} meeting on ${day}.`
      : `${home} and ${away} drew ${homeScore}-${awayScore} in the ${competition} on ${day}.`;
  }

  const venue = homeWon ? "at home" : "away from home";

  return `${winner} ${winVerb(value, shape)} ${loser} ${high}-${low} ${venue} in the ${competition} on ${day}.`;
}

/**
 * The half-time sentence — the only part of the report that says anything about how the
 * match developed, and the reason half-time scores are stored at all.
 */
function halfTimeSentence(facts: MatchFacts, shape: Shape): string | null {
  const { home, away, homeScore, awayScore, halfTimeHome, halfTimeAway } = facts;

  if (typeof halfTimeHome !== "number" || typeof halfTimeAway !== "number") return null;

  const halfTimeGoals = halfTimeHome + halfTimeAway;
  const secondHalfGoals = homeScore + awayScore - halfTimeGoals;

  /**
   * Stated from the leader's point of view, highest score first.
   *
   * Printing the raw home-away pair reads as an error whenever the away side is ahead:
   * "Chelsea led 0-2 at the interval" is how that came out before this existed.
   */
  const leading = halfTimeHome > halfTimeAway ? home : away;
  const leadScore = `${Math.max(halfTimeHome, halfTimeAway)}-${Math.min(halfTimeHome, halfTimeAway)}`;
  const levelScore = `${halfTimeHome}-${halfTimeAway}`;

  switch (shape) {
    case "comeback":
      return `${leading} led ${leadScore} at the interval, but the second half turned the match around.`;

    case "second-half":
      return halfTimeGoals === 0
        ? `Neither side had scored by half-time, leaving the match to be settled after the break.`
        : `The teams were level at ${levelScore} at half-time before the game was decided in the second half.`;

    case "held-on":
      return `${leading} were ${leadScore} up at the break and saw the game out from there.`;

    default:
      // A goalless match has no half-time story to tell, and saying "the scoring was
      // done by half-time" about a 0-0 is plainly wrong.
      if (halfTimeGoals === 0 && secondHalfGoals === 0) return null;

      if (secondHalfGoals === 0) {
        return halfTimeHome === halfTimeAway
          ? `Both goals came before the break, with the sides level at ${levelScore} at half-time.`
          : `The scoring was done by half-time, ${leading} having gone ${leadScore} up before the break.`;
      }

      if (halfTimeGoals === 0) {
        return `It was goalless at the break, with all ${secondHalfGoals} goals arriving in the second half.`;
      }

      if (secondHalfGoals >= 3) {
        return `It was ${levelScore} at half-time, with ${secondHalfGoals} of the goals arriving after the break.`;
      }

      return halfTimeHome === halfTimeAway
        ? `The sides were level at ${levelScore} at half-time.`
        : `${leading} led ${leadScore} at half-time.`;
  }
}

/** Closing context: matchday and competition. Never a prediction. */
function contextSentence(facts: MatchFacts): string {
  const { competition, matchday } = facts;

  if (typeof matchday === "number") {
    return `The result came on matchday ${matchday} of the ${competition}.`;
  }

  return `The match was part of the ${competition} programme.`;
}

/**
 * Total goals, mentioned only when it's genuinely notable.
 *
 * Nothing is said about a goalless game here: the headline and opening sentence have
 * already said it twice, and a third mention was the report's most obviously mechanical
 * moment.
 */
function goalsSentence(facts: MatchFacts): string | null {
  const total = facts.homeScore + facts.awayScore;

  if (total >= 6) return `The ${total} goals made it one of the highest-scoring games of the round.`;

  return null;
}

export function generateMatchReport(facts: MatchFacts): GeneratedReport {
  const value = seed(facts);
  const shape = describeShape(facts);

  const title = buildTitle(facts, shape, value);

  const sentences = [
    openingSentence(facts, shape, value),
    halfTimeSentence(facts, shape),
    goalsSentence(facts),
    contextSentence(facts),
  ].filter((sentence): sentence is string => Boolean(sentence));

  // Two paragraphs: the result, then how it unfolded and where it sits. Matches how the
  // article page renders (blank-line-separated paragraphs).
  const body = [sentences[0], sentences.slice(1).join(" ")].filter(Boolean).join("\n\n");

  const excerpt = `${sentences[0]} ${sentences[1] ?? ""}`.trim();

  return {
    title,
    // Cards clamp the excerpt, but keep it a sensible length regardless.
    excerpt: excerpt.length > 200 ? `${excerpt.slice(0, 197).trimEnd()}…` : excerpt,
    body,
  };
}

/**
 * Whether a finished match is worth its own article.
 *
 * Dozens of matches finish on a busy weekend and, with no scorers available, an
 * individual report on a routine 1-0 would be three near-identical sentences. Those are
 * better served by the daily round-up, so a standalone report is reserved for results
 * that actually have something to say: a comeback, a rout, or a goal glut.
 */
export function isReportWorthy(facts: MatchFacts): boolean {
  const shape = describeShape(facts);
  const total = facts.homeScore + facts.awayScore;
  const margin = Math.abs(facts.homeScore - facts.awayScore);

  return shape === "comeback" || margin >= 3 || total >= 5;
}
