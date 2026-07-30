import type { FeedItem } from "@/lib/feeds/rss";

/**
 * Groups feed items that are covering the same event.
 *
 * Two reasons this matters, one editorial and one legal:
 *
 *  - A story reported by both Sky and the Guardian gives the drafter two independent
 *    accounts of the same facts. Facts that appear in both are corroborated; a detail
 *    only one carries can be treated with more caution.
 *  - Writing from several accounts of an event produces genuinely original prose,
 *    because there is no single passage to lean on. Rewriting one publisher's
 *    sentences would still be derived from their expression however much the wording
 *    changed — the point is to report the same facts, not to disguise a copy.
 *
 * Also collapses the duplicates a single publisher creates by filing one story to
 * several feeds.
 *
 * A caveat worth keeping in mind: in practice most stories still end up single-source,
 * because the two feeds publish at very different volumes. Corroboration is a bonus
 * when it happens, not something the pipeline depends on — what keeps the output
 * original is that the drafter writes from facts, never from anyone's wording.
 */

export type StoryCluster = {
  items: FeedItem[];
  /** Distinct publishers in the cluster, for attribution. */
  sources: string[];
  /** Earliest publication time across the cluster. */
  publishedAt: Date;
  category: "News" | "Transfer";
};

/**
 * Capitalised words that start a sentence rather than name anything — the main source
 * of false entities, since every headline's first word is capitalised.
 */
const NON_ENTITY_CAPITALS = new Set([
  "a", "after", "all", "an", "and", "as", "at", "back", "big", "both", "but", "can",
  "could", "did", "do", "every", "experimental", "first", "for", "from", "has", "have",
  "how", "in", "is", "it", "its", "just", "last", "more", "most", "new", "no", "not",
  "now", "of", "off", "on", "one", "only", "or", "out", "over", "revealed", "said",
  "set", "she", "should", "so", "than", "that", "the", "their", "then", "there",
  "these", "they", "this", "to", "top", "two", "up", "was", "we", "were", "what",
  "when", "where", "which", "who", "why", "will", "with", "would", "you",
  // Capitalised football filler that isn't a name
  "boss", "club", "cup", "deal", "exclusive", "fc", "goal", "league", "live", "match",
  "news", "player", "report", "reports", "season", "side", "star", "team", "transfer",
  "win",
]);

/**
 * The proper nouns in a headline — clubs, players, managers, competitions.
 *
 * Entities rather than all words because that's what two independent reports of the
 * same event actually share. "Liverpool beat Wrexham in New York to maintain perfect
 * pre-season under Iraola" and "Experimental Liverpool down Wrexham thanks to Rio
 * Ngumoha's deflected strike" have almost no phrasing in common — word-overlap scores
 * them at 0.13 — but both name Liverpool and Wrexham, which is the thing that actually
 * identifies the story.
 */
function entities(title: string): Set<string> {
  const found = new Set<string>();

  // Split on non-letters but keep the original case, so capitalisation still reads.
  for (const word of title.split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < 3) continue;

    const first = word[0];
    // Capitalised, or fully upper-case (PSG, VAR).
    if (first !== first.toUpperCase() || first === first.toLowerCase()) continue;

    const normalised = word
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    if (NON_ENTITY_CAPITALS.has(normalised)) continue;

    found.add(normalised);
  }

  return found;
}

/**
 * Overlap coefficient — shared entities over the smaller set.
 *
 * Not Jaccard: headlines differ a lot in how many names they pack in, and Jaccard
 * penalises the longer headline for detail it added rather than for disagreeing.
 */
function entityOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  for (const entity of a) if (b.has(entity)) shared += 1;

  return shared / Math.min(a.size, b.size);
}

function sharedCount(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const entity of a) if (b.has(entity)) shared += 1;
  return shared;
}

/**
 * Merge rules, all of which must hold. A false merge is the expensive mistake — it
 * produces one article conflating two unrelated events — so each rule closes off a
 * specific way that could happen.
 */
/** One shared club name proves nothing; a club appears in several stories a day. */
const MIN_SHARED_ENTITIES = 2;
/** A third of the smaller headline's names. Enough for the real cross-source pairs. */
const MIN_ENTITY_OVERLAP = 0.34;
/**
 * Both headlines must name at least this many things for overlap to mean anything.
 *
 * A two-name headline scores a perfect 1.0 against anything that happens to mention
 * both, which is how the explainer "Who is Matthias Jaissle?" attached itself to a
 * full report of Howe leaving Newcastle. Short headlines carry too little signal;
 * leaving them on their own is the safe outcome.
 */
const MIN_HEADLINE_ENTITIES = 3;
/** Reports of the same event land in the same news cycle. */
const MAX_HOURS_APART = 12;

export function clusterFeedItems(items: FeedItem[]): StoryCluster[] {
  const clusters: {
    items: FeedItem[];
    entities: Set<string>;
    publishedAt: number;
  }[] = [];
  const seenGuids = new Set<string>();

  for (const item of items) {
    // A publisher filing the same item to two of its feeds is not two stories.
    if (seenGuids.has(item.guid)) continue;
    seenGuids.add(item.guid);

    const itemEntities = entities(item.title);

    const match = clusters.find((cluster) => {
      if (
        cluster.entities.size < MIN_HEADLINE_ENTITIES ||
        itemEntities.size < MIN_HEADLINE_ENTITIES
      ) {
        return false;
      }

      const hoursApart =
        Math.abs(cluster.publishedAt - item.publishedAt.getTime()) / (60 * 60 * 1000);
      if (hoursApart > MAX_HOURS_APART) return false;

      return (
        sharedCount(cluster.entities, itemEntities) >= MIN_SHARED_ENTITIES &&
        entityOverlap(cluster.entities, itemEntities) >= MIN_ENTITY_OVERLAP
      );
    });

    if (match) {
      match.items.push(item);
      // Keep only the entities both headlines name, so a cluster's identity tightens as
      // it grows instead of drifting to match everything.
      for (const entity of match.entities) {
        if (!itemEntities.has(entity)) match.entities.delete(entity);
      }
      match.publishedAt = Math.min(match.publishedAt, item.publishedAt.getTime());
      continue;
    }

    clusters.push({
      items: [item],
      entities: itemEntities,
      publishedAt: item.publishedAt.getTime(),
    });
  }

  return clusters.map((cluster) => ({
    items: cluster.items,
    sources: [...new Set(cluster.items.map((item) => item.source))],
    publishedAt: new Date(cluster.publishedAt),
    // If any report files it as a transfer story, treat the cluster as one — transfer
    // is the more specific classification, and publishers disagree often enough that
    // requiring agreement would split genuine clusters.
    category: cluster.items.some((item) => item.suggestedCategory === "Transfer")
      ? "Transfer"
      : "News",
  }));
}
