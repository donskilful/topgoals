/**
 * Pulls the *facts* out of a feed item so we can report them in our own words.
 *
 * This is the same principle the match reports rest on: facts about the world aren't
 * copyrightable, the words used to report them are. "Chelsea signed Maxence Lacroix from
 * Crystal Palace" is a fact — it happened, anyone can state it, and stating it is not using
 * Sky's writing. What we must never do is rework their sentences.
 *
 * So nothing here copies phrasing. It reads a headline, decides whether it describes a
 * clearly identifiable event, and returns that event as structured data — who, which clubs,
 * what happened, how certain it is. `compose.ts` then writes sentences from the structure.
 *
 * ## The two rules that make this safe
 *
 * 1. **Certainty is never upgraded.** "Real Madrid *expected to* make offer for Rodri" is a
 *    report of an expectation, not a transfer. Publishing it as "Real Madrid made an offer"
 *    would be inventing a fact, and on a site with betting tips beside it that can cost a
 *    reader money. Certainty travels with the facts and the composer must honour it.
 * 2. **Anything ambiguous returns null.** Q&As, pundit columns, features, explainers and
 *    multi-story headlines are not reduced to a guess — they stay link-only. A missed story
 *    costs nothing; a misread one is a false statement published under our name.
 */

/** How firmly the source states it. Determines the wording, and is never raised. */
export type Certainty = "confirmed" | "reported";

export type StoryKind =
  | "transfer_completed"
  | "transfer_interest"
  | "contract_signed"
  | "manager_departure"
  | "manager_appointment";

export type ExtractedStory = {
  kind: StoryKind;
  certainty: Certainty;
  /** The player or manager the story is about. */
  subject: string;
  /** Club joining / renewing with / departing, depending on kind. */
  club?: string;
  /** Club being left, for a completed transfer. */
  fromClub?: string;
  /** Fee, if one is stated as a plain figure ("£25m"). Facts, not phrasing. */
  fee?: string;
  /** Contract length, e.g. "four-year". */
  contractLength?: string;
};

/**
 * Headline shapes that never describe a single reportable event.
 *
 * Checked before any pattern runs, because several of these would otherwise match a
 * transfer pattern on a fragment and produce a confidently wrong article — "Carra:
 * Liverpool don't need Barcola" is one pundit's opinion, not Liverpool declining a signing.
 */
const NOT_A_NEWS_EVENT = [
  /\?/, // questions: "Who is Matthias Jaissle?", "will it impact...?"
  /^q&a\b/i,
  /^papers:/i,
  /\bpaper talk\b/i,
  /^opinion\b/i,
  /^analysis\b/i,
  /^preview\b/i,
  /^watch\b/i,
  /^ratings\b/i,
  /\bthe inside story\b/i,
  /\bthe stats behind\b/i,
  /\bexplained\b/i,
  /\bwhat we learned\b/i,
  /\bhow .* (became|changed|works)\b/i,
  /\brevels in\b/i,
  /\bhails\b/i,
  /\binsists\b/i,
  /\bwarns\b/i,
  /\bclaims\b/i,
  // A pundit or interviewee attribution prefix: "Carra:", "Merson:", "Arteta:"
  /^[A-Z][A-Za-z'-]{2,}:\s/,
  // A quoted phrase leading the headline is a colour piece or an interview.
  /^['‘"“]/,
];

/** Club shorthands publishers use, mapped to the name we'd print. */
const CLUB_ALIASES: Record<string, string> = {
  palace: "Crystal Palace",
  spurs: "Tottenham",
  toon: "Newcastle",
  wolves: "Wolves",
  utd: "United",
  psg: "Paris Saint-Germain",
  "man utd": "Manchester United",
  "man united": "Manchester United",
  "man city": "Manchester City",
  inter: "Inter Milan",
  atleti: "Atlético Madrid",
  barca: "Barcelona",
  "real": "Real Madrid",
};

/**
 * Publishers often name a player as "<selling club> <position> <surname>" — "Celtic
 * midfielder Engels". Left alone that whole phrase became the subject, producing the clumsy
 * "linked with a move for Celtic midfielder Engels" and burying the selling club where the
 * composer couldn't use it.
 */
const POSITION_WORDS =
  /^(.+?)\s+(?:midfielder|defender|forward|striker|winger|goalkeeper|centre-?back|full-?back|left-?back|right-?back|attacker)\s+(.+)$/i;

function splitPositionPhrase(subject: string): { subject: string; fromClub?: string } {
  const match = subject.match(POSITION_WORDS);
  if (!match) return { subject };

  const club = match[1].trim();
  const name = match[2].trim();

  // Only accept the split when both halves stand up as names on their own.
  if (!isName(club) || !isName(name)) return { subject };

  return { subject: name, fromClub: club };
}

function tidyClub(raw: string): string {
  const trimmed = raw.trim().replace(/[.,!]+$/, "");
  return CLUB_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Rejects capture groups that clearly aren't a name.
 *
 * Regexes over prose will happily capture a verb phrase, and a wrong capture becomes a
 * sentence asserting that a club signed "the start of season". Names are short, start with
 * a capital, and don't contain function words.
 */
const FUNCTION_WORDS =
  /\b(the|a|an|and|but|for|from|with|that|this|his|her|their|will|would|could|should|about|after|before|over|into|out|not|new|deal|move|transfer|season|club|side|talks|offer|bid|fee|report|reports)\b/i;

function isName(candidate: string | undefined): candidate is string {
  if (!candidate) return false;

  const value = candidate.trim();

  if (value.length < 3 || value.length > 40) return false;
  if (!/^[\p{Lu}]/u.test(value)) return false;
  if (FUNCTION_WORDS.test(value)) return false;
  // At most three words — "Paris Saint-Germain" yes, a clause no.
  if (value.split(/\s+/).length > 3) return false;

  return true;
}

/**
 * A plain money figure — a fact rather than anyone's phrasing.
 *
 * **Read from the headline only, never the summary.** A summary routinely covers more than
 * one story, and a figure in it cannot be reliably attributed to the subject we extracted.
 * Caught in testing on a real Guardian item:
 *
 *   "Maxence Lacroix joins Chelsea as John Stones seals Inter deal"
 *   summary: "...£52m transfer / Stones signs two-year contract... / Lacroix, 26, signs a
 *             six-year deal..."
 *
 * Scanning that summary attributed **Stones'** two-year contract to **Lacroix**, who had
 * actually signed for six years — a fabricated fact published under our name, next to
 * betting tips. The same summary pair also disagreed on the fee (£51m vs £52m).
 *
 * A headline makes one claim about one subject, so a figure in it belongs to that subject.
 * The cost is that fees and contract lengths rarely appear; a shorter true article beats a
 * fuller false one.
 */
function findFee(text: string): string | undefined {
  const match = text.match(/[£€$]\s?\d+(?:\.\d+)?\s?(?:m|million|bn|billion)?/i);
  return match ? match[0].replace(/\s+/g, "") : undefined;
}

function findContractLength(text: string): string | undefined {
  const match = text.match(
    /\b(one|two|three|four|five|six|seven|\d+)[-\s]year\b/i,
  );
  return match ? `${match[1].toLowerCase()}-year` : undefined;
}

/**
 * Ordered most specific first — the first match wins, so a pattern that pins down both
 * clubs is tried before one that only names the buyer.
 */
const PATTERNS: {
  kind: StoryKind;
  certainty: Certainty;
  re: RegExp;
  build: (m: RegExpMatchArray) => Partial<ExtractedStory>;
}[] = [
  // "Makhanya seals Rangers move from MLS" / "Lacroix completes Chelsea move from Palace"
  {
    kind: "transfer_completed",
    certainty: "confirmed",
    re: /^(.+?)\s+(?:seals|completes|finalises)\s+(.+?)\s+(?:move|switch|transfer)\s+from\s+(.+)$/i,
    build: (m) => ({ subject: m[1].trim(), club: tidyClub(m[2]), fromClub: tidyClub(m[3]) }),
  },
  // "Chelsea sign Lacroix from Palace" / "Chelsea complete signing of Lacroix from Palace"
  {
    kind: "transfer_completed",
    certainty: "confirmed",
    re: /^(.+?)\s+(?:sign|signs|complete the signing of|complete signing of|seal|seals)\s+(.+?)\s+from\s+(.+)$/i,
    build: (m) => ({ club: tidyClub(m[1]), subject: m[2].trim(), fromClub: tidyClub(m[3]) }),
  },
  // "Lacroix joins Chelsea"
  {
    kind: "transfer_completed",
    certainty: "confirmed",
    re: /^(.+?)\s+(?:joins|has joined)\s+(.+)$/i,
    build: (m) => ({ subject: m[1].trim(), club: tidyClub(m[2]) }),
  },
  // "Chelsea sign Lacroix"
  {
    kind: "transfer_completed",
    certainty: "confirmed",
    re: /^(.+?)\s+(?:sign|signs)\s+(.+)$/i,
    build: (m) => ({ club: tidyClub(m[1]), subject: m[2].trim() }),
  },
  // "Saka signs new long-term deal with Arsenal" / "Hampton signs new Chelsea deal"
  {
    kind: "contract_signed",
    certainty: "confirmed",
    re: /^(.+?)\s+signs?\s+new\s+.*?\bdeal\b(?:\s+with\s+(.+))?$/i,
    build: (m) => ({ subject: m[1].trim(), club: m[2] ? tidyClub(m[2]) : undefined }),
  },
  // "Real Madrid expected to make offer for Rodri" — an expectation, not a transfer.
  {
    kind: "transfer_interest",
    certainty: "reported",
    re: /^(.+?)\s+(?:expected to make|set to make|prepare|preparing|ready)\s+(?:an?\s+)?(?:offer|bid|approach)\s+for\s+(.+)$/i,
    build: (m) => ({ club: tidyClub(m[1]), subject: m[2].trim() }),
  },
  // "Liverpool set to open talks with PSG over Barcola signing"
  {
    kind: "transfer_interest",
    certainty: "reported",
    re: /^(.+?)\s+(?:in talks|open talks|hold talks|set to open talks)\s+(?:with\s+.+?\s+)?(?:over|for)\s+(.+?)(?:\s+signing)?$/i,
    build: (m) => ({ club: tidyClub(m[1]), subject: m[2].trim() }),
  },
  // "Chelsea interested in Henderson"
  {
    kind: "transfer_interest",
    certainty: "reported",
    re: /^(.+?)\s+(?:interested in|eyeing|monitoring|want|wants|target|targeting)\s+(.+)$/i,
    build: (m) => ({ club: tidyClub(m[1]), subject: m[2].trim() }),
  },
  // "Howe leaves Newcastle"
  {
    kind: "manager_departure",
    certainty: "confirmed",
    re: /^(.+?)\s+(?:leaves|departs|has left)\s+(.+)$/i,
    build: (m) => ({ subject: m[1].trim(), club: tidyClub(m[2]) }),
  },
  // "Newcastle appoint Jaissle"
  {
    kind: "manager_appointment",
    certainty: "confirmed",
    re: /^(.+?)\s+(?:appoint|appoints|name|names)\s+(.+?)(?:\s+as\s+.+)?$/i,
    build: (m) => ({ club: tidyClub(m[1]), subject: m[2].trim() }),
  },
];

/**
 * A headline covering two stories at once, joined by " as ".
 *
 * "Maxence Lacroix joins 'beautiful club' Chelsea as John Stones seals Inter deal" is two
 * transfers. Only the first clause is used — reporting one of the two accurately beats
 * conflating them, and the second remains available as a link.
 */
function firstClause(headline: string): string {
  return headline.split(/\s+\bas\b\s+/i)[0];
}

/**
 * Removes quoted fragments, which are the one place a headline carries someone's words
 * rather than a fact.
 *
 * Two shapes, both common: a colour quote leading the headline ("'Dream come true' -
 * Makhanya seals Rangers move") and one dropped mid-sentence ("Lacroix joins 'beautiful
 * club' Chelsea"). Removing them leaves the reportable fact and — not incidentally — leaves
 * the publisher's chosen phrasing behind, which is exactly what we don't want to reuse.
 */
function stripQuotes(headline: string): string {
  return headline
    .replace(/^['‘"“][^'’"”]{0,60}['’"”]\s*[-–—]\s*/, "")
    .replace(/\s*['‘"“][^'’"”]{0,60}['’"”]\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Takes the headline only.
 *
 * Summaries are deliberately not read: they routinely cover more than one story, so nothing
 * in them can be reliably attributed to the subject extracted here. See `findFee` for the
 * fabrication that discovered.
 */
export function extractStory(headline: string): ExtractedStory | null {
  const cleaned = stripQuotes(headline);

  if (NOT_A_NEWS_EVENT.some((pattern) => pattern.test(cleaned))) return null;

  // Drop a trailing sub-clause after a dash — usually a second, separate development.
  const candidate = firstClause(cleaned).split(/\s+[-–—]\s+/)[0].trim();

  for (const pattern of PATTERNS) {
    const match = candidate.match(pattern.re);
    if (!match) continue;

    const parts = pattern.build(match);

    // "Celtic midfielder Engels" -> subject "Engels", selling club "Celtic".
    if (parts.subject) {
      const refined = splitPositionPhrase(parts.subject);
      parts.subject = refined.subject;
      if (refined.fromClub && !parts.fromClub) parts.fromClub = tidyClub(refined.fromClub);
    }

    /**
     * A junk capture means *this* pattern misread the headline — so try the next one rather
     * than abandoning the story.
     *
     * This distinction matters more than it looks. "Makhanya seals Rangers move from MLS"
     * is matched by the loose "<club> seals <player> from <club>" shape first, capturing
     * "Rangers move" as the player. Bailing out on that dropped a perfectly extractable
     * transfer; continuing lets the stricter "<player> seals <club> move from <club>"
     * pattern below it match correctly.
     */
    if (!isName(parts.subject)) continue;
    if (parts.club !== undefined && !isName(parts.club)) continue;
    if (parts.fromClub !== undefined && !isName(parts.fromClub)) continue;

    // A completed transfer with no destination club is not a story we can state.
    if (pattern.kind === "transfer_completed" && !parts.club) continue;

    return {
      kind: pattern.kind,
      certainty: pattern.certainty,
      subject: parts.subject,
      club: parts.club,
      fromClub: parts.fromClub,
      // Headline only — see findFee for the fabrication this prevents.
      fee: findFee(candidate),
      contractLength: findContractLength(candidate),
    };
  }

  return null;
}

/**
 * A stable identity for the *event*, not the headline.
 *
 * Two publishers reporting one signing produce very different headlines — "Chelsea sign
 * Lacroix from Palace" and "Maxence Lacroix joins 'beautiful club' Chelsea" — but the same
 * extracted facts. Keying on the facts means one article with both outlets credited, rather
 * than two articles about the same transfer.
 *
 * Only the surname is used, because one publisher writes "Maxence Lacroix" and the other
 * writes "Lacroix", and they must land on the same key.
 */
export function storyKey(story: ExtractedStory): string {
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");

  const surname = normalise(story.subject.split(/\s+/).at(-1) ?? story.subject);
  const club = story.club ? normalise(story.club) : "none";

  return `story:${story.kind}:${club}:${surname}`;
}
