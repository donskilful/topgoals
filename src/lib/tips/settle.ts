import { parseMarket, type Market, type Period, type Side } from "@/lib/tips/markets";
import { sameTeam } from "@/lib/tips/teams";

/**
 * Grades a tip against the actual result of its fixture.
 *
 * Returns null whenever the outcome can't be established with certainty — an unreadable
 * selection, a team name that doesn't match the fixture, a missing half-time score. The
 * caller leaves those pending for a human. Guessing here would write a false result into the
 * public track record, which is the number readers stake money on, so "I don't know" has to
 * be a first-class answer rather than a fallback to lost.
 */

export type MatchOutcome = {
  home: string;
  away: string;
  /** Full-time goals. Null when the match hasn't produced a usable score. */
  homeScore: number | null;
  awayScore: number | null;
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  status: "live" | "finished" | "upcoming" | "postponed";
};

export type Settlement =
  | { result: "won" | "lost" | "void"; reason: string }
  | { result: null; reason: string };

/**
 * Matches a tipster's team wording against the fixture's team names.
 *
 * The comparison itself lives in `@/lib/tips/teams` because the settlement job and provider
 * ingestion have to agree with it exactly — if they disagreed, a tip could be matched to a
 * fixture that the settler then refused to grade.
 *
 * Ambiguity is treated as failure: if the text matches both teams, or neither, we don't know
 * which side was backed and must not pick one.
 */
function resolveSide(team: string, outcome: MatchOutcome): Side | null {
  const matchesHome = sameTeam(team, outcome.home);
  const matchesAway = sameTeam(team, outcome.away);

  // Matching both is as useless as matching neither.
  if (matchesHome === matchesAway) return null;

  return matchesHome ? "home" : "away";
}

/** The goals relevant to the market's period, or null when we don't hold them. */
function goalsFor(
  outcome: MatchOutcome,
  period: Period,
): { home: number; away: number } | null {
  if (period === "first_half") {
    if (typeof outcome.halfTimeHome !== "number" || typeof outcome.halfTimeAway !== "number") {
      return null;
    }
    return { home: outcome.halfTimeHome, away: outcome.halfTimeAway };
  }

  if (typeof outcome.homeScore !== "number" || typeof outcome.awayScore !== "number") return null;

  return { home: outcome.homeScore, away: outcome.awayScore };
}

function winningSide(home: number, away: number): Side {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Grades a combo: every leg has to land.
 *
 * The order the legs are judged in is deliberate. A single losing leg loses the whole bet
 * regardless of what the others did, so that's checked first and can be returned even if
 * another leg is ungradeable. Only when nothing has lost does an ungradeable leg force the
 * tip back to pending — otherwise a combo containing one unreadable leg could never be
 * settled, even when a different leg had already killed it.
 *
 * A void leg drops out of the accumulator the way a bookmaker treats a push, so a combo whose
 * every leg voided is itself void.
 */
function gradeCombo(legs: Market[], outcome: MatchOutcome): Settlement {
  const graded = legs.map((leg) => grade(leg, outcome));

  const lost = graded.find((settlement) => settlement.result === "lost");
  if (lost) return { result: "lost", reason: `leg failed — ${lost.reason}` };

  const ungradeable = graded.find((settlement) => settlement.result === null);
  if (ungradeable) return { result: null, reason: ungradeable.reason };

  const won = graded.filter((settlement) => settlement.result === "won");
  if (won.length === 0) return { result: "void", reason: "every leg voided" };

  return {
    result: "won",
    reason: `all ${graded.length} legs landed — ${won[0].reason}`,
  };
}

function grade(market: Market, outcome: MatchOutcome): Settlement {
  if (market.kind === "combo") return gradeCombo(market.legs, outcome);

  const period: Period = "period" in market ? market.period : "full";
  const goals = goalsFor(outcome, period);

  if (!goals) {
    return {
      result: null,
      reason:
        period === "first_half"
          ? "no half-time score recorded for this fixture"
          : "no full-time score recorded for this fixture",
    };
  }

  const total = goals.home + goals.away;
  const label = period === "first_half" ? "half-time" : "full-time";
  const scoreline = `${goals.home}-${goals.away}`;

  switch (market.kind) {
    case "total_goals": {
      // A whole-number line can land exactly on it, which is a push, not a loss.
      if (Number.isInteger(market.line) && total === market.line) {
        return { result: "void", reason: `${total} goals landed exactly on the ${market.line} line` };
      }

      const over = total > market.line;
      const won = market.direction === "over" ? over : !over;

      return {
        result: won ? "won" : "lost",
        reason: `${total} goals at ${label} (${scoreline})`,
      };
    }

    case "btts": {
      const both = goals.home > 0 && goals.away > 0;
      return {
        result: both === market.expected ? "won" : "lost",
        reason: `${label} ${scoreline}, both teams scored: ${both ? "yes" : "no"}`,
      };
    }

    case "result": {
      const side = market.side ?? (market.team ? resolveSide(market.team, outcome) : null);

      if (!side) {
        return {
          result: null,
          reason: `couldn't tell which side "${market.team}" refers to in ${outcome.home} v ${outcome.away}`,
        };
      }

      return {
        result: winningSide(goals.home, goals.away) === side ? "won" : "lost",
        reason: `${label} ${scoreline}`,
      };
    }

    case "double_chance": {
      const sides = [...market.sides];

      if (market.team) {
        const side = resolveSide(market.team, outcome);
        if (!side) {
          return {
            result: null,
            reason: `couldn't tell which side "${market.team}" refers to in ${outcome.home} v ${outcome.away}`,
          };
        }
        sides.push(side);
      }

      return {
        result: sides.includes(winningSide(goals.home, goals.away)) ? "won" : "lost",
        reason: `${label} ${scoreline}`,
      };
    }

    case "handicap": {
      const side = resolveSide(market.team, outcome);
      if (!side) {
        return {
          result: null,
          reason: `couldn't tell which side "${market.team}" refers to in ${outcome.home} v ${outcome.away}`,
        };
      }

      const backed = side === "home" ? goals.home : goals.away;
      const opponent = side === "home" ? goals.away : goals.home;
      const adjusted = backed + market.line;

      if (adjusted === opponent) {
        return { result: "void", reason: `handicap landed level at ${scoreline}` };
      }

      return {
        result: adjusted > opponent ? "won" : "lost",
        reason: `${scoreline}, ${market.team} ${market.line > 0 ? "+" : ""}${market.line}`,
      };
    }

    case "correct_score": {
      const exact = goals.home === market.home && goals.away === market.away;
      return {
        result: exact ? "won" : "lost",
        reason: `${label} ${scoreline}, backed ${market.home}-${market.away}`,
      };
    }

    case "clean_sheet": {
      const side = resolveSide(market.team, outcome);
      if (!side) {
        return {
          result: null,
          reason: `couldn't tell which side "${market.team}" refers to in ${outcome.home} v ${outcome.away}`,
        };
      }

      const conceded = side === "home" ? goals.away : goals.home;
      const scored = side === "home" ? goals.home : goals.away;
      const kept = conceded === 0 && (!market.winToNil || scored > 0);

      return {
        result: kept ? "won" : "lost",
        reason: `${label} ${scoreline}`,
      };
    }
  }
}

/**
 * Settles one tip. The only entry point callers should use.
 *
 * A postponed or cancelled fixture voids the tip rather than losing it — the selection never
 * had the chance to run, and grading it as a loss would understate the record just as much as
 * grading it a win would flatter it.
 */
export function settleTip(pick: string, outcome: MatchOutcome): Settlement {
  if (outcome.status === "postponed") {
    return { result: "void", reason: "fixture was postponed or cancelled" };
  }

  if (outcome.status !== "finished") {
    return { result: null, reason: `fixture is ${outcome.status}, not finished` };
  }

  const market = parseMarket(pick);

  if (!market) {
    return { result: null, reason: `selection "${pick}" isn't one this can grade from a scoreline` };
  }

  return grade(market, outcome);
}
