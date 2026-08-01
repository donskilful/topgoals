import type { ProviderAdapter, ProviderTip } from "@/lib/providers/types";

/**
 * Reads published picks from footballpredictions.net.
 *
 * ## Why this provider
 *
 * It was the one candidate of eight that both permits crawling and serves its picks in the
 * HTML. Of the others, forebet.com and windrawwin.com return 403 to an honest crawler,
 * predictz.com sits behind a bot challenge, betensured.com disallows the paths the picks live
 * on, tips180.com renders client-side, statarea.com exposes no pick markup, and soccervista.com
 * was unreachable. A 403 or a bot challenge is an access control, so those are simply out —
 * spoofing a browser User-Agent to get past one is not something this will do.
 *
 * This site's robots.txt disallows `/api`, so only the rendered pages are read, and requests
 * identify themselves honestly.
 *
 * ## Markup, and why it's parsed this way
 *
 * Each pick is a `.match-card` holding `.home-team .team-label`, `.away-team .team-label`, a
 * `<moment>` element with an unlabelled timestamp, and `.prediction`. Competition is *not*
 * inside the card — it's a `.competition-match-title` section heading above a run of cards, so
 * the parser tracks the most recent heading as it walks the document in order.
 *
 * Parsed with scoped regex rather than a DOM library because the needed structure is shallow
 * and flat, and it avoids a dependency for one file. The failure mode is safe either way: a
 * card whose fields don't all read is skipped, never half-built.
 */

/** Identifies the crawler honestly, with a contact route, per the site's own terms. */
const USER_AGENT = "TopGoalsBot/1.0 (+https://topgoals.example/about)";

const BASE = "https://footballpredictions.net";

/**
 * Pages to read.
 *
 * Market-wide pages rather than the per-league ones: they cover every competition the site
 * previews that day in a handful of requests, and they don't need a hand-maintained list of
 * league slugs that goes stale each time the site renames one. The daily page alone carried 46
 * picks when this was written.
 */
const SOURCE_PATHS = [
  "/football-predictions-free-betting-tips",
  "/win-draw-win-predictions-full-time-result-betting-tips",
  "/both-teams-to-score-win-predictions-btts-win-tips",
  "/correct-score-predictions-betting-tips",
  "/bet-of-the-day",
];

/** Strips tags and entities from a fragment of markup. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reads the provider's unlabelled "YYYY-MM-DD HH:MM:SS" timestamp.
 *
 * Parsed as UTC deliberately. The value carries no offset and the site converts it in the
 * browser, so any offset we picked would be a guess — and a guess here would post fixtures at
 * the wrong time. Treating it as UTC keeps it a consistent, documented *hint*: ingestion only
 * uses it to narrow which of our synced matches this pick refers to, with hours of tolerance,
 * and stores our own kick-off on the tip. Never surfaced to a reader.
 */
function parseHint(value: string): Date | null {
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const time = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? "0"),
  );

  return Number.isNaN(time) ? null : new Date(time);
}

/** A pick's selection text, with the site's pointing-hand decoration removed. */
function cleanPick(html: string): string {
  return textOf(html)
    .replace(/^[\p{Extended_Pictographic}‍️\s]+/u, "")
    .trim();
}

/**
 * Pulls every pick out of one page.
 *
 * Exported for testing against saved markup — the parser is the part most likely to break
 * silently when the site is redesigned, so it has to be checkable without a live request.
 */
export function parsePicksPage(html: string, pageUrl: string): ProviderTip[] {
  const tips: ProviderTip[] = [];

  // Cards and competition headings, in document order, so a heading applies to the cards
  // that follow it.
  const markers = [
    ...html.matchAll(/class="(match-card|competition-match-title)\b/g),
  ];

  let competitionLabel = "";

  for (const [index, marker] of markers.entries()) {
    const start = marker.index;
    const end = markers[index + 1]?.index ?? html.length;
    const block = html.slice(start, end);

    if (marker[1] === "competition-match-title") {
      // The heading text sits between the opening tag and its inline SVG chevron.
      competitionLabel = textOf(block.split("<svg")[0].replace(/^[^>]*>/, ""));
      continue;
    }

    const home = block.match(
      /class="home-team[^"]*"[\s\S]*?class="team-label"\s*>([\s\S]*?)</,
    );
    const away = block.match(
      /class="away-team[^"]*"[\s\S]*?class="team-label"\s*>([\s\S]*?)</,
    );
    const kickoff = block.match(/<moment[^>]*>([\s\S]*?)<\/moment>/);
    const pick = block.match(/class="prediction"\s*>([\s\S]*?)<\/div>/);
    const link = block.match(/class="preview-button"[^>]*?href="([^"]+)"/);

    if (!home || !away || !kickoff || !pick) continue;

    const hint = parseHint(textOf(kickoff[1]));
    if (!hint) continue;

    const selection = cleanPick(pick[1]);
    const homeName = textOf(home[1]);
    const awayName = textOf(away[1]);

    // A card mid-render, or a layout block that merely looks like one, yields blanks. There's
    // nothing to salvage from a pick with no selection or no teams.
    if (!selection || !homeName || !awayName) continue;

    tips.push({
      home: homeName,
      away: awayName,
      kickoffHint: hint,
      competitionLabel,
      pick: selection,
      url: link?.[1] ?? pageUrl,
    });
  }

  return tips;
}

async function fetchPage(path: string): Promise<string | null> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      // Always read live markup; a cached page would republish yesterday's picks as today's.
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.warn(`footballpredictions.net ${path} returned ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.warn(`Could not read footballpredictions.net ${path}:`, error);
    return null;
  }
}

export const footballPredictionsNet: ProviderAdapter = {
  name: "footballpredictions.net",
  homepage: BASE,

  async fetchTips() {
    const tips: ProviderTip[] = [];

    // Sequential, with a pause between requests. Five pages is nothing to us but hammering a
    // free site in parallel is rude, and a crawler that behaves is one that keeps working.
    for (const path of SOURCE_PATHS) {
      const html = await fetchPage(path);
      if (html) tips.push(...parsePicksPage(html, `${BASE}${path}`));
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    return tips;
  },
};
