/**
 * Settlement regression suite.
 *
 * Run with `npm run test:settlement`. No test framework — the project has none, and this needs
 * none: pure functions in, expected verdicts out.
 *
 * ## Why this lives in the repo
 *
 * These are the only functions on the site that can silently publish something false. Everything
 * else fails loudly: a broken query throws, a bad layout is visible. A misgraded tip just quietly
 * moves the win rate — the one number a reader stakes money on — and nothing downstream would
 * ever flag it.
 *
 * It earned its place. An earlier version of this suite was written as a throwaway script and
 * lost; the combo bug it would have caught (`BTTS and Haaland anytime scorer` grading as a winner
 * off the BTTS leg alone) then shipped unnoticed until the parser was pointed at real provider
 * picks. The cases below encode every such bug found so far.
 *
 * The convention throughout: `null` means "we don't know", and asserting `null` is as important
 * as asserting `won`. Most of these cases exist to prove the code *refuses* to answer.
 */

import { settleTip, type MatchOutcome } from "@/lib/tips/settle";
import { parseMarket, describeUnsettleable } from "@/lib/tips/markets";

type Expected = "won" | "lost" | "void" | null;

let passed = 0;
const failures: string[] = [];

/** A finished fixture, unless a different status is given. */
function game(
  home: string,
  away: string,
  homeScore: number | null,
  awayScore: number | null,
  extra: Partial<MatchOutcome> = {},
): MatchOutcome {
  return {
    home,
    away,
    homeScore,
    awayScore,
    halfTimeHome: null,
    halfTimeAway: null,
    status: "finished",
    ...extra,
  };
}

function check(pick: string, outcome: MatchOutcome, expected: Expected, note = "") {
  const settlement = settleTip(pick, outcome);

  if (settlement.result === expected) {
    passed += 1;
    return;
  }

  failures.push(
    `${pick} @ ${outcome.home} ${outcome.homeScore}-${outcome.awayScore} ${outcome.away}` +
      ` (${outcome.status}) => ${settlement.result}, expected ${expected}` +
      `${note ? ` [${note}]` : ""}\n      reason: ${settlement.reason}`,
  );
}

const arsChe = (h: number | null, a: number | null, extra: Partial<MatchOutcome> = {}) =>
  game("Arsenal", "Chelsea", h, a, extra);

// ---------------------------------------------------------------- total goals
check("Over 2.5 Goals", arsChe(2, 1), "won");
check("Over 2.5 Goals", arsChe(1, 1), "lost");
check("Under 3.5 Goals", arsChe(2, 1), "won");
check("Under 2.5", arsChe(3, 1), "lost");
// A whole-number line can land exactly on it. That's a push, not a loss.
check("Over 2 Goals", arsChe(1, 1), "void", "exact line is a push");
check("Under 2 Goals", arsChe(1, 1), "void", "exact line is a push");
check("HT Over 0.5 Goals", arsChe(2, 1, { halfTimeHome: 1, halfTimeAway: 0 }), "won");
check("HT Over 1.5 Goals", arsChe(4, 0, { halfTimeHome: 1, halfTimeAway: 0 }), "lost");
// The full-time score is known but the half-time score isn't — so a first-half market is not.
check("First Half Over 0.5 Goals", arsChe(3, 0), null, "no half-time score held");

// ---------------------------------------------------------------------- BTTS
check("Both Teams to Score", arsChe(1, 1), "won");
check("Both Teams to Score", arsChe(2, 0), "lost");
check("BTTS", arsChe(1, 2), "won");
check("BTTS No", arsChe(2, 0), "won");
check("BTTS No", arsChe(1, 1), "lost");
check("Both Teams to Score - No", arsChe(3, 0), "won");

// -------------------------------------------------------------------- result
check("Arsenal to Win", arsChe(2, 1), "won");
check("Arsenal to Win", arsChe(1, 2), "lost");
check("Arsenal to Win", arsChe(1, 1), "lost");
check("Chelsea to win", arsChe(0, 1), "won");
check("Home Win", arsChe(2, 0), "won");
check("Away Win", arsChe(0, 2), "won");
check("Draw", arsChe(1, 1), "won");
check("Draw", arsChe(2, 1), "lost");
// Short forms and accents still have to resolve to the right side.
check("Man City to win", game("Manchester City", "Everton", 3, 0), "won");
check("Vålerenga to win", game("Valerenga", "Bodo Glimt", 2, 1), "won");
// A team that isn't in this fixture: refuse rather than pick a side.
check("Spurs to Win", arsChe(2, 1), null, "team not in fixture");

// ------------------------------------------------------------- double chance
check("Arsenal or Draw", arsChe(1, 1), "won");
check("Arsenal or Draw", arsChe(0, 1), "lost");
check("Double Chance: Home/Draw", arsChe(1, 1), "won");
check("Chelsea or Draw", arsChe(2, 1), "lost");

// ------------------------------------------------------------------ handicap
check("Arsenal -1 Handicap", arsChe(3, 1), "won");
check("Arsenal -1 Handicap", arsChe(2, 1), "void", "handicap lands level");
check("Arsenal -1 Handicap", arsChe(1, 1), "lost");
check("Chelsea +1.5", arsChe(2, 1), "won");

// ------------------------------------------------------------- correct score
check("Correct Score 2-1", arsChe(2, 1), "won");
check("Correct Score 2-1", arsChe(1, 2), "lost", "scoreline is directional");
// Providers publish correct-score picks as a bare scoreline, with no label at all.
check("2-1", arsChe(2, 1), "won");
check("0-0", arsChe(0, 0), "won");
check("0-1", arsChe(1, 0), "lost");

// --------------------------------------------------------------- clean sheet
check("Arsenal clean sheet", arsChe(0, 0), "won");
check("Arsenal to keep a clean sheet", arsChe(2, 0), "won");
check("Arsenal clean sheet", arsChe(2, 1), "lost");
check("Arsenal to win to nil", arsChe(2, 0), "won");
check("Arsenal to win to nil", arsChe(0, 0), "lost", "a goalless draw is not a win to nil");

// --------------------------------------------------------------------- combos
// Every leg must land. Grading a combo on one leg would inflate the record.
check("BTTS and Arsenal to win", arsChe(2, 1), "won");
check("BTTS and Arsenal to win", arsChe(1, 2), "lost", "result leg failed");
check("BTTS and Arsenal to win", arsChe(1, 0), "lost", "goals leg failed");
check("BTTS and Draw", arsChe(1, 1), "won");
check("BTTS and Draw", arsChe(0, 0), "lost");
check("Over 2.5 Goals and Arsenal to win", arsChe(3, 1), "won");
check("Over 2.5 Goals & BTTS", arsChe(2, 1), "won");
// One leg ungradeable: pending, unless another leg has already lost the bet outright.
check("BTTS and Spurs to win", arsChe(2, 1), null, "one leg names a team not in the fixture");
check("BTTS and Spurs to win", arsChe(1, 0), "lost", "a lost leg decides it regardless");
// A club whose name contains "and" must not be split into legs.
check("Bosnia and Herzegovina to win", game("Bosnia and Herzegovina", "Wales", 2, 1), "won");
check("West Bromwich Albion to win", game("West Bromwich Albion", "Leeds", 1, 0), "won");

// --------------------------------------------- markets we must never grade
// These need data the free fixture feed doesn't return. Approximating them is not an option.
check("Haaland anytime scorer", arsChe(3, 0), null);
check("Saka to score first", arsChe(2, 0), null);
check("Over 9.5 Corners", arsChe(2, 0), null);
check("Over 3.5 Cards", arsChe(2, 0), null);
check("Arsenal to win and Saka anytime scorer", arsChe(2, 0), null, "combo hiding a player leg");
// The bug this suite was written for: "BTTS" inside the string must not wave the rest through.
check("BTTS and Haaland anytime scorer", arsChe(2, 1), null, "BTTS must not exempt the combo");

// ------------------------------------------------------------ fixture status
check("Arsenal to Win", arsChe(0, 0, { status: "postponed" }), "void", "never had a chance to run");
check("Arsenal to Win", arsChe(null, null, { status: "upcoming" }), null);
check("Arsenal to Win", arsChe(1, 0, { status: "live" }), null, "not final yet");
check("Arsenal to Win", arsChe(null, null, { status: "finished" }), null, "finished with no score");

// ------------------------------------------------------------- unreadable text
check("", arsChe(2, 1), null);
check("Arsenal look good here", arsChe(2, 1), null, "prose is not a selection");

// ------------------------------------- describeUnsettleable explains the refusal
const explanations: [string, boolean][] = [
  ["Haaland anytime scorer", true],
  ["Over 9.5 Corners", true],
  ["BTTS and Haaland anytime scorer", true],
  ["Both Teams to Score", false],
  ["BTTS", false],
  ["Over 2.5 Goals", false],
  ["BTTS and Arsenal to win", false],
];

for (const [pick, shouldExplain] of explanations) {
  const explained = describeUnsettleable(pick) !== null;
  if (explained === shouldExplain) {
    passed += 1;
  } else {
    failures.push(
      `describeUnsettleable("${pick}") ${explained ? "explained" : "said nothing"},` +
        ` expected ${shouldExplain ? "an explanation" : "nothing"}`,
    );
  }
}

// --------------------------------- a refused market must never parse to a market
for (const [pick, shouldExplain] of explanations) {
  if (!shouldExplain) continue;

  if (parseMarket(pick) === null) {
    passed += 1;
  } else {
    failures.push(`parseMarket("${pick}") returned a market for a selection we cannot grade`);
  }
}

// ------------------------------------------------------------------- report
console.log(`\n${passed} passed, ${failures.length} failed\n`);

for (const failure of failures) console.error(`  FAIL  ${failure}`);

if (failures.length > 0) process.exit(1);

console.log("Settlement behaves as specified.");
