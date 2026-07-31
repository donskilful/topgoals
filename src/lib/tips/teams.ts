/**
 * Comparing team names written by different sources.
 *
 * Every source spells clubs its own way — "Man City" / "Manchester City", "FC Trenkwalder
 * Admira" / "Admira Wacker", "Vålerenga" / "Valerenga" — so names have to be compared loosely
 * or nothing ever matches. Kept in one place because three callers need the identical rule:
 * the settler resolving which side a selection backs, the settlement job finding a tip's
 * fixture, and provider ingestion matching a scraped pick to a synced match. Three slightly
 * different implementations would settle the same tip three different ways.
 */

/** Common club-name affixes that carry no distinguishing information. */
const AFFIXES = /\b(fc|afc|cf|sc|ac|cd|ss|as|sv|bk|if|ca|club|deportivo)\b/g;

/**
 * Reduces a team name to a comparable core: lowercase, accents stripped, affixes and
 * punctuation removed.
 *
 * Accent folding is done via NFKD decomposition rather than a character map so it covers every
 * source alphabet at once — "Puskás", "Vålerenga" and "Argeș" all arrive from the same feed.
 */
export function normaliseTeam(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[đĐ]/g, "d")
    .replace(AFFIXES, " ")
    .replace(/[^a-z0-9]/g, "");
}

/** Splits a name into comparable words, dropping affixes and one- or two-letter stubs. */
function tokensOf(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length >= 3 && !/^(fc|afc|the|club)$/.test(token));
}

/**
 * Whether every word of the shorter name begins a distinct word of the longer one.
 *
 * This is what makes the abbreviations tipsters actually write resolve: "Man City" against
 * "Manchester City", "Wolves" against "Wolverhampton Wanderers", "Ath Bilbao" against
 * "Athletic Bilbao". Plain containment can't do it, because "mancity" appears nowhere inside
 * "manchestercity".
 *
 * Preferred over an alias table, which would need a hand-maintained entry per club across every
 * league on the site and would silently fail for the ones nobody thought to add.
 *
 * Requiring *distinct* target words is what keeps it honest: it stops one word of the query
 * satisfying itself twice, so "Real Real" can't pass as "Real Madrid". And because every word
 * must match, "Man City" cannot reach "Manchester United" — "city" begins neither word.
 */
function abbreviates(shorter: string[], longer: string[]): boolean {
  if (shorter.length === 0 || shorter.length > longer.length) return false;

  const claimed = new Set<number>();

  return shorter.every((token) => {
    const index = longer.findIndex(
      (candidate, position) => !claimed.has(position) && candidate.startsWith(token),
    );

    if (index === -1) return false;

    claimed.add(index);
    return true;
  });
}

/**
 * Whether two names plausibly refer to the same club.
 *
 * Tried loosest-safe first: containment in either direction, then word-prefix abbreviation.
 * The three-character floor stops a stub like "AC" matching half the league once affixes have
 * been stripped out.
 *
 * A false positive here is worse than a false negative. A name this rejects leaves a tip
 * pending, which is visible and fixable; a name it wrongly accepts settles a tip against the
 * wrong match and writes a confidently false result into the public record. Callers rely on
 * that asymmetry — they treat "matches both teams" as failure rather than choosing one.
 */
export function sameTeam(a: string, b: string): boolean {
  const left = normaliseTeam(a);
  const right = normaliseTeam(b);

  if (left.length < 3 || right.length < 3) return false;

  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = tokensOf(a);
  const rightTokens = tokensOf(b);

  return leftTokens.length <= rightTokens.length
    ? abbreviates(leftTokens, rightTokens)
    : abbreviates(rightTokens, leftTokens);
}
