/**
 * Turns a tip's selection text into a structured market that can be graded.
 *
 * Tips are written by hand as free text ("Over 2.5 Goals", "Man City -1 Handicap"), so
 * settling them automatically means reading that text. The governing rule is the same one
 * the news extractor follows, and it matters more here:
 *
 * **Never guess.** An unrecognised selection returns null and the tip stays pending for a
 * human to settle. A misread selection silently writes a wrong result into the track
 * record — the one number a reader stakes money on — and nothing downstream would ever
 * flag it. A tip left pending is visible and fixable; a tip settled wrongly is invisible
 * and permanent.
 *
 * ## What can be graded, and why that's the limit
 *
 * Everything here is derivable from a scoreline, because the scoreline (full time and half
 * time) is all the free provider tier gives us. Player markets — anytime scorer, cards,
 * corners — are not gradeable at any confidence and are deliberately unparsed, so they fall
 * through to manual settlement rather than being approximated.
 */

/** Which side of the match a selection backs. */
export type Side = "home" | "away" | "draw";

/** The part of the match a selection applies to. */
export type Period = "full" | "first_half";

export type Market =
  /** "Over 2.5 Goals", "Under 3.5", "HT Over 0.5" */
  | { kind: "total_goals"; direction: "over" | "under"; line: number; period: Period }
  /** "Both Teams to Score", "BTTS No" */
  | { kind: "btts"; expected: boolean; period: Period }
  /** "Arsenal to Win", "Draw", "Home Win" — `team` resolved against the fixture later. */
  | { kind: "result"; side?: Side; team?: string; period: Period }
  /** "Arsenal or Draw", "Double Chance: Home/Draw" */
  | { kind: "double_chance"; sides: Side[]; team?: string }
  /** "Man City -1 Handicap", "Arsenal +1.5" */
  | { kind: "handicap"; team: string; line: number }
  /** "Correct Score 2-1" */
  | { kind: "correct_score"; home: number; away: number }
  /** "Arsenal clean sheet", "Arsenal to win to nil" */
  | { kind: "clean_sheet"; team: string; winToNil: boolean };

/**
 * Selections we can recognise but must never grade from a scoreline.
 *
 * Listed explicitly rather than left to fall through, so `describeUnsettleable` can tell an
 * editor *why* a tip needs settling by hand instead of leaving them guessing at a silent
 * skip. All of them need data the free tier doesn't return.
 */
const NEEDS_MORE_THAN_A_SCORELINE = [
  { re: /\b(anytime|first|last)\s+(goal)?scorer\b/i, needs: "goalscorer data" },
  { re: /\bto score\b/i, needs: "goalscorer data" },
  { re: /\bhat[-\s]?trick\b/i, needs: "goalscorer data" },
  { re: /\bcard(s)?\b/i, needs: "booking data" },
  { re: /\bcorner(s)?\b/i, needs: "corner data" },
  { re: /\bfoul(s)?\b/i, needs: "match statistics" },
  { re: /\bshot(s)?\b/i, needs: "match statistics" },
  { re: /\bassist\b/i, needs: "goalscorer data" },
  { re: /\bpenalt(y|ies)\b/i, needs: "match events" },
];

/**
 * Wordings that are gradeable despite colliding with the refusal list above.
 *
 * "Both Teams to Score" contains "to score", which the goalscorer rule matches — so a market
 * that is *exactly* gradeable from a scoreline was being refused. Checked first, because a
 * specific known-good phrase should always beat a general suspicion.
 */
const ALWAYS_GRADEABLE = [
  /\bbtts\b/i,
  /\bboth teams to score\b/i,
  /\bboth to score\b/i,
  /\bto score\s+(?:first|last)\s+half\b/i,
];

export function describeUnsettleable(pick: string): string | null {
  if (ALWAYS_GRADEABLE.some((pattern) => pattern.test(pick))) return null;

  const hit = NEEDS_MORE_THAN_A_SCORELINE.find((entry) => entry.re.test(pick));
  return hit ? `needs ${hit.needs}, which the fixture feed doesn't provide` : null;
}

/** "first half" in any of the forms tipsters write it. */
function detectPeriod(pick: string): Period {
  return /\b(ht|first half|1st half|half[-\s]?time)\b/i.test(pick) ? "first_half" : "full";
}

/**
 * Strips period markers and market boilerplate so the remainder can be read as a team name.
 * Done as removal rather than extraction because team names are open-ended — we can't
 * enumerate them, but we can enumerate the words that aren't part of one.
 */
function stripNoise(text: string): string {
  return text
    .replace(/\b(ht|ft|first half|1st half|half[-\s]?time|full[-\s]?time)\b/gi, " ")
    .replace(/\b(double chance|correct score|handicap|asian|european|result|match)\b/gi, " ")
    .replace(/[:|]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseMarket(pick: string): Market | null {
  const raw = pick.trim();
  if (!raw) return null;

  // Refuse anything needing data we don't have, before any pattern can half-match it.
  if (describeUnsettleable(raw)) return null;

  const period = detectPeriod(raw);
  const text = stripNoise(raw);

  // --- Correct score: "Correct Score 2-1", "2-1" ---
  const correctScore = text.match(/(?:^|\s)(\d{1,2})\s*[-–:]\s*(\d{1,2})(?:\s|$)/);
  if (correctScore && /correct\s*score/i.test(raw)) {
    return {
      kind: "correct_score",
      home: Number(correctScore[1]),
      away: Number(correctScore[2]),
    };
  }

  // --- Total goals: "Over 2.5 Goals", "Under 3.5" ---
  const totals = text.match(/\b(over|under)\s+(\d{1,2}(?:\.\d)?)\b/i);
  if (totals) {
    return {
      kind: "total_goals",
      direction: totals[1].toLowerCase() as "over" | "under",
      line: Number(totals[2]),
      period,
    };
  }

  // --- Both teams to score ---
  if (/\bbtts\b|\bboth teams to score\b|\bboth to score\b/i.test(raw)) {
    // "BTTS No", "Both Teams to Score - No"
    const negated = /\b(no|not)\b/i.test(raw.replace(/\bnot?ts\b/i, ""));
    return { kind: "btts", expected: !negated, period };
  }

  // --- Clean sheet / win to nil ---
  const cleanSheet = text.match(/^(.+?)\s+(?:to\s+)?(?:keep a\s+)?clean sheet$/i);
  if (cleanSheet) {
    return { kind: "clean_sheet", team: cleanSheet[1].trim(), winToNil: false };
  }
  const winToNil = text.match(/^(.+?)\s+to win to nil$/i);
  if (winToNil) {
    return { kind: "clean_sheet", team: winToNil[1].trim(), winToNil: true };
  }

  // --- Handicap: "Man City -1 Handicap", "Arsenal +1.5" ---
  const handicap = text.match(/^(.+?)\s+([+-]\d{1,2}(?:\.\d)?)\s*$/);
  if (handicap && /handicap|[+-]\d/.test(raw)) {
    return { kind: "handicap", team: handicap[1].trim(), line: Number(handicap[2]) };
  }

  // --- Double chance: "Arsenal or Draw", "Draw or Arsenal" ---
  const doubleChance = text.match(/^(.+?)\s+or\s+(.+?)$/i);
  if (doubleChance) {
    const parts = [doubleChance[1].trim(), doubleChance[2].trim()];
    const sides: Side[] = [];
    let team: string | undefined;

    for (const part of parts) {
      if (/^draw$/i.test(part)) sides.push("draw");
      else if (/^home$/i.test(part)) sides.push("home");
      else if (/^away$/i.test(part)) sides.push("away");
      else team = part;
    }

    if (sides.length > 0 && (team || sides.length === 2)) {
      return { kind: "double_chance", sides, team };
    }
  }

  // --- Draw ---
  if (/^draw$/i.test(text)) return { kind: "result", side: "draw", period };

  // --- Result: "Arsenal to Win", "Home Win", "Away to Win" ---
  const result = text.match(/^(.+?)\s+(?:to\s+)?win(?:s)?$/i) ?? text.match(/^(.+?)\s+win$/i);
  if (result) {
    const who = result[1].trim();

    if (/^home$/i.test(who)) return { kind: "result", side: "home", period };
    if (/^away$/i.test(who)) return { kind: "result", side: "away", period };

    return { kind: "result", team: who, period };
  }

  return null;
}
