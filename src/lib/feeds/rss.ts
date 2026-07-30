import { XMLParser } from "fast-xml-parser";

/**
 * Reads public RSS feeds to learn *what happened* — never to republish how a
 * publisher said it.
 *
 * Only the facts a feed states in its own summary (who, what, which club, which
 * competition, when) travel any further than this file: `src/lib/ai/draft-article.ts`
 * turns those facts into original prose, and the source's own sentences are dropped.
 * Facts about the world aren't copyrightable; the words used to report them are. That
 * distinction is the whole reason this pipeline is built the way it is, so please keep
 * summaries out of anything user-facing.
 *
 * Every article we publish links back to the sources it was reported from — see
 * `sources` on the Article model.
 */

/** The publishers we monitor. Both offer public RSS with no auth or key. */
/**
 * Every story must sit under a football section on the publisher's own site.
 *
 * TopGoals is a football site, and this is the guard that keeps it one. Picking the
 * right feed is not enough on its own: feed 12040 looked like Sky's football news feed
 * and was actually its all-sport feed, which put cricket, tennis and darts stories into
 * the pipeline. Both publishers file football under a /football/ path, so checking the
 * article's own URL is a check on what the story *is* rather than on which feed
 * happened to carry it — and it keeps holding if a feed's contents change or someone
 * adds a new source later.
 */
const FOOTBALL_PATH = "/football/";

function isFootballStory(link: string): boolean {
  try {
    return new URL(link).pathname.toLowerCase().includes(FOOTBALL_PATH);
  } catch {
    return false;
  }
}

export const NEWS_FEEDS = [
  {
    name: "Sky Sports",
    /**
     * Sky Sports **football** news.
     *
     * Feed 11095, not 12040. Both are titled "SkySports | News" and look
     * interchangeable, but 12040 is Sky's all-sport feed — in testing only 8 of its 20
     * items were football, and cricket, tennis and darts stories were reaching a
     * football site. 11095 is football-only.
     */
    url: "https://www.skysports.com/rss/11095",
    /** Which of our two categories items from this feed usually belong to. */
    defaultCategory: "News" as const,
  },
  {
    name: "Sky Sports",
    /** Sky Sports Football — transfer centre. */
    url: "https://www.skysports.com/rss/12691",
    defaultCategory: "Transfer" as const,
  },
  {
    name: "Guardian Football",
    url: "https://www.theguardian.com/football/rss",
    defaultCategory: "News" as const,
  },
] as const;

export type FeedSource = (typeof NEWS_FEEDS)[number];

export type FeedItem = {
  /** Publisher name, shown to readers as attribution. */
  source: string;
  /** Canonical article URL at the publisher, for the attribution link. */
  link: string;
  /**
   * Stable per-item identifier. Used to remember what we've already covered, so a
   * story that sits in a feed for two days isn't written up twice.
   */
  guid: string;
  title: string;
  /**
   * The feed's own one-or-two-sentence summary. Read only as a statement of facts
   * and never stored or displayed — see the module comment.
   */
  summary: string;
  publishedAt: Date;
  categories: string[];
  suggestedCategory: "News" | "Transfer";
};

export class FeedError extends Error {
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message);
    this.name = "FeedError";
  }
}

/**
 * `isArray: false` everywhere except <item>/<category>, the two elements that
 * legitimately repeat. Without this, a feed with exactly one item parses to an object
 * and a feed with several parses to an array, and every caller needs the same guard.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  isArray: (name) => name === "item" || name === "category",
});

/** Strips the HTML publishers put inside <description> and collapses whitespace. */
function toPlainText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** RSS elements can parse as a string, a number, or `{ "#text": ... }` depending on content. */
function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) {
    return text((value as { "#text": unknown })["#text"]);
  }
  return "";
}

/**
 * RFC-822 timezone abbreviations, which `new Date()` does not understand.
 *
 * Sky Sports stamps its feed in local British time — "Thu, 30 Jul 2026 08:47:00 BST" —
 * and `new Date()` returns Invalid Date for it. That silently made every Sky item look
 * like it had just been published, which defeated the recency window entirely and let a
 * six-day-old transfer round-up through as breaking news. Hence this table.
 */
const TIMEZONE_OFFSETS: Record<string, string> = {
  UT: "+0000",
  UTC: "+0000",
  GMT: "+0000",
  Z: "+0000",
  // British civil time
  BST: "+0100",
  // Central European, which some European feeds use
  CET: "+0100",
  CEST: "+0200",
  // US zones, for completeness
  EST: "-0500",
  EDT: "-0400",
  CST: "-0600",
  CDT: "-0500",
  MST: "-0700",
  MDT: "-0600",
  PST: "-0800",
  PDT: "-0700",
};

/**
 * Parses an RSS date, returning null when it genuinely can't be read.
 *
 * Null rather than "now" on failure, deliberately: an item whose age is unknown cannot
 * be filtered by recency, and publishing a story as if it broke this minute when it
 * might be a week old is worse than not covering it.
 */
export function parseFeedDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  // Swap a trailing alphabetic zone for its numeric offset and retry.
  const withZone = raw.replace(/\s+([A-Z]{1,4})$/, (_match, abbreviation: string) => {
    const offset = TIMEZONE_OFFSETS[abbreviation];
    return offset ? ` ${offset}` : ` ${abbreviation}`;
  });

  if (withZone !== raw) {
    const retried = new Date(withZone);
    if (!Number.isNaN(retried.getTime())) return retried;
  }

  return null;
}

/**
 * Feed items that aren't a single reportable event.
 *
 * These exist in every football feed and none of them can produce an honest article:
 *
 *  - **Live blogs and rolling round-ups** ("Transfer Centre LIVE!", "Arsenal latest:")
 *    are a continuously edited page covering many unrelated items. Writing a news story
 *    from one is writing a story about nothing in particular.
 *  - **Paper reviews and gossip columns** ("Papers:", "Paper talk", "Gossip") are
 *    round-ups of other outlets' unconfirmed rumours. Publishing rumour as reported
 *    fact is the single most misleading thing this pipeline could do, and on a site
 *    that sits next to betting tips it's the thing most likely to cost a reader money.
 *  - **Quizzes, polls and podcasts** aren't news at all.
 */
const NON_STORY_PATTERNS = [
  /\bLIVE!/i,
  /\bLIVE:/i,
  /\blive blog\b/i,
  /\bas it happened\b/i,
  /\bminute[- ]by[- ]minute\b/i,
  /^papers:/i,
  /\bpaper talk\b/i,
  /\bgossip\b/i,
  /\btransfer rumours?\b/i,
  /\brumours?:/i,
  /\btransfer centre\b/i,
  /\blatest:/i,
  /\bquiz\b/i,
  /\bpodcast\b/i,
  /^vote\b/i,
  /\bvote & comment\b/i,
  /\bhave your say\b/i,
  /\bwatch:/i,
  /\bhighlights:/i,
];

function isReportableStory(title: string, summary: string): boolean {
  if (NON_STORY_PATTERNS.some((pattern) => pattern.test(title))) return false;

  // The Guardian appends a columnist's byline to opinion pieces — "Fifa wants more
  // money for its members … | John Duerden". Opinion is that writer's argument, not a
  // reportable event, and rewriting it as news would misrepresent it as fact.
  if (/\s\|\s/.test(title)) return false;

  // No summary means no facts beyond the headline, and a headline alone is not enough
  // to write an accurate article from — the drafter would have to invent the detail.
  // This is also what catches live blogs that don't announce themselves in the title.
  return summary.length >= 60;
}

/**
 * A stable identity for a story, independent of which feed carried it.
 *
 * Sky files the same article to both its news and transfer feeds, and the URLs differ
 * only in the feed-id segment:
 *
 *   /football/news/11095/13566543/maxence-lacroix-transfer-news-chelsea-...
 *   /football/news/12691/13566543/maxence-lacroix-transfer-news-chelsea-...
 *
 * Same story, same article id (13566543), two different guids — and treating them as
 * two items publishes the story twice. So Sky URLs are keyed on the article id, with
 * the feed id dropped.
 *
 * Deliberately matched per publisher rather than by a general rule. A generic "use the
 * longest number in the path" heuristic looks equivalent and is not: the Guardian's
 * URLs carry a date (/football/2026/jul/30/slug), so it keys every Guardian story on
 * the year and collapses the entire feed into one item. Anything unrecognised falls
 * back to the full path, which is always at least as unique as the raw URL.
 */
export function canonicalStoryId(link: string): string {
  let url: URL;

  try {
    url = new URL(link);
  } catch {
    return link;
  }

  const host = url.host.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();

  if (host.endsWith("skysports.com")) {
    // /football/news/<feedId>/<articleId>/<slug>
    const skyArticle = path.match(/^\/[a-z-]+\/news\/\d+\/(\d+)\//);
    if (skyArticle) return `skysports:${skyArticle[1]}`;
  }

  return `${host}${path}`;
}

type RawItem = Record<string, unknown>;

/**
 * Transfer stories are worth their own category, and the feed usually says so — Sky
 * files them under a transfer-specific feed, the Guardian tags them. Falling back to
 * the wording of the headline catches the rest.
 */
function categoriseItem(
  title: string,
  categories: string[],
  fallback: "News" | "Transfer",
): "News" | "Transfer" {
  const haystack = [title, ...categories].join(" ").toLowerCase();

  if (/\btransfer|signing|signs for|joins|move to|deal for|bid for|loan\b/.test(haystack)) {
    return "Transfer";
  }

  return fallback;
}

function parseItem(raw: RawItem, source: FeedSource): FeedItem | null {
  const title = toPlainText(text(raw.title));
  const link = text(raw.link) || text(raw.guid);

  // A headline and a link back to the source are both non-negotiable: without the
  // headline there's no story, and without the link we can't attribute it.
  if (!title || !link) return null;

  // Football only — see FOOTBALL_PATH.
  if (!isFootballStory(link)) return null;

  const categories = Array.isArray(raw.category)
    ? raw.category.map((entry) => toPlainText(text(entry))).filter(Boolean)
    : [];

  const publishedAt = parseFeedDate(text(raw.pubDate) || text(raw["dc:date"]));

  // Without a readable timestamp we can't tell whether this broke an hour ago or last
  // month, so there's no safe way to publish it. Dropping it is the honest option.
  if (!publishedAt) return null;

  const summary = toPlainText(text(raw.description));

  if (!isReportableStory(title, summary)) return null;

  return {
    source: source.name,
    link,
    // Derived from the link rather than taken from <guid>, so the same story
    // cross-filed to two feeds is recognised as one story. This is also the dedupe key
    // stored on the article, so it must stay stable across runs.
    guid: canonicalStoryId(link),
    title,
    summary,
    publishedAt,
    categories,
    suggestedCategory: categoriseItem(title, categories, source.defaultCategory),
  };
}

async function fetchFeed(source: FeedSource): Promise<FeedItem[]> {
  let response: Response;

  try {
    response = await fetch(source.url, {
      headers: {
        // Feeds are published for aggregators; identify ourselves honestly rather
        // than spoofing a browser.
        "User-Agent": "TopGoalsBot/1.0 (+https://topgoals.example/about)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      cache: "no-store",
      // The Guardian's feed is large and has been seen to take over 15s. Generous
      // enough to avoid dropping a healthy source, still well inside the cron's budget.
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    throw new FeedError(
      `Could not reach ${source.name}: ${error instanceof Error ? error.message : "network error"}`,
      source.url,
    );
  }

  if (!response.ok) {
    throw new FeedError(`${source.name} returned HTTP ${response.status}`, source.url);
  }

  const parsed = parser.parse(await response.text()) as {
    rss?: { channel?: { item?: RawItem[] } };
  };

  const items = parsed.rss?.channel?.item ?? [];

  return items
    .map((raw) => parseItem(raw, source))
    .filter((item): item is FeedItem => item !== null);
}

/**
 * Reads every configured feed and returns the items published inside `withinHours`.
 *
 * One slow or broken publisher must not stop the others — a failed feed is logged and
 * skipped, so the run still produces whatever the healthy feeds carried.
 */
export async function fetchFeedItems({ withinHours = 24 } = {}): Promise<FeedItem[]> {
  const settled = await Promise.allSettled(NEWS_FEEDS.map(fetchFeed));
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  const items: FeedItem[] = [];

  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`Feed skipped (${NEWS_FEEDS[index].url}):`, result.reason);
      return;
    }
    items.push(...result.value.filter((item) => item.publishedAt.getTime() >= cutoff));
  });

  // Newest first, so a capped run covers the freshest stories.
  return items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
