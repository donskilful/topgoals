import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { StandingRow } from "@/lib/models/standing-row";
import { fetchFeedItems, type FeedItem } from "@/lib/feeds/rss";
import { extractStory, storyKey, type ExtractedStory } from "@/lib/news/extract";
import { composeArticle, type ComposeContext } from "@/lib/news/compose";
import { getAutomationActor } from "@/lib/automation-actor";
import { logAudit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { revalidateContent } from "@/lib/actions/revalidate";

/**
 * Publishes news and transfer articles written from the facts in the football feeds.
 *
 * The pipeline: read the feeds → extract the event from each headline as structured data →
 * group reports of the same event → write our own sentences from the facts → publish.
 *
 * No source prose survives extraction, so nothing here is a paraphrase (see
 * `src/lib/news/extract.ts` for why that distinction is the thing keeping this sound). Pure
 * JavaScript throughout — no language model, no per-article cost.
 *
 * ## What this deliberately doesn't do
 *
 * Most feed items produce nothing. Q&As, pundit columns, features, explainers and anything
 * whose wording is ambiguous are skipped rather than guessed at, and remain available as
 * link-outs in "Around the Web". Expect a minority of headlines to become articles — a
 * missed story costs nothing, a misread one publishes a false statement under our name.
 *
 * Unconfirmed reports are published *as* reports, credited to the outlet making the claim,
 * and never as settled fact.
 */

/** Bounded so a busy transfer window can't flood the site in one run. */
const MAX_ARTICLES_PER_RUN = 8;

/** Wider than the cron interval so a missed run catches up on the next one. */
const LOOKBACK_HOURS = 24;

export type NewsArticleSyncResult = {
  feedItems: number;
  extracted: number;
  /** Distinct events after merging multiple reports of the same story. */
  stories: number;
  alreadyCovered: number;
  published: number;
  failed: number;
};

type StoryGroup = {
  key: string;
  story: ExtractedStory;
  items: FeedItem[];
};

/**
 * Groups feed items by the event they describe rather than by headline wording.
 *
 * Keyed on the extracted facts, so "Chelsea sign Lacroix from Palace" and "Maxence Lacroix
 * joins Chelsea" land together and produce one article crediting both outlets.
 *
 * The richest extraction wins as the group's representative: whichever report names the
 * selling club, or the fee, tells us the most, and a headline that omits it shouldn't
 * discard what another one supplied.
 */
function groupByStory(items: FeedItem[]): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();

  for (const item of items) {
    const story = extractStory(item.title);
    if (!story) continue;

    const key = storyKey(story);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { key, story, items: [item] });
      continue;
    }

    existing.items.push(item);

    const detail = (candidate: ExtractedStory) =>
      (candidate.fromClub ? 1 : 0) + (candidate.fee ? 1 : 0) + (candidate.contractLength ? 1 : 0);

    /**
     * Pick the fuller name *before* the detail swap, then reapply it after.
     *
     * One outlet writes "Lacroix" and another "Maxence Lacroix", and the reader is better
     * served by the full one. Comparing after the swap doesn't work: the swap replaces the
     * whole story — shorter name included — so the comparison is then against the value
     * just written, and always ties.
     */
    const fullestSubject =
      story.subject.length > existing.story.subject.length
        ? story.subject
        : existing.story.subject;

    if (detail(story) > detail(existing.story)) existing.story = story;

    existing.story = { ...existing.story, subject: fullestSubject };
  }

  return [...groups.values()];
}

/**
 * "Chelsea currently sit 4th in the Premier League" — context from our own tables.
 *
 * **Only from rows the feed is actively maintaining** (`autoSynced`). Hand-entered and
 * left-over seeded rows are ignored, because "currently sit" is a claim about right now and
 * a stale table makes it false. This produced exactly that in testing: a pre-season article
 * asserting Chelsea sat 4th on 45 points, read off seeded rows from a season that hadn't
 * started. The standings sync already refuses to publish a pre-season table; this is the
 * matching guard on the read side.
 */
async function describeStanding(club?: string): Promise<string | undefined> {
  if (!club) return undefined;

  // Match on our stored short names ("Man City", "Chelsea"), which rarely equal the
  // publisher's wording exactly — so compare case-insensitively but anchored, never as a
  // bare substring that could match the wrong club.
  const row = await StandingRow.findOne({
    autoSynced: true,
    team: new RegExp(`^${club.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("team pos competition played points")
    .lean();

  // No live table for this club — say nothing rather than reach for a stale one.
  if (!row) return undefined;

  const ordinal = (n: number) => {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
    return `${n}${suffix}`;
  };

  return `${row.team} currently sit ${ordinal(row.pos)} in the ${row.competition} on ${row.points} points`;
}

export async function syncNewsArticles(): Promise<NewsArticleSyncResult> {
  const items = await fetchFeedItems({ withinHours: LOOKBACK_HOURS });
  const groups = groupByStory(items);

  const result: NewsArticleSyncResult = {
    feedItems: items.length,
    extracted: groups.reduce((sum, group) => sum + group.items.length, 0),
    stories: groups.length,
    alreadyCovered: 0,
    published: 0,
    failed: 0,
  };

  if (groups.length === 0) return result;

  await dbConnect();

  const covered = await Article.find({ sourceGuids: { $in: groups.map((g) => g.key) } })
    .select("sourceGuids")
    .lean();

  const coveredKeys = new Set(covered.flatMap((article) => article.sourceGuids));

  const fresh = groups.filter((group) => !coveredKeys.has(group.key));
  result.alreadyCovered = groups.length - fresh.length;

  // Corroborated stories first, then the most recent.
  const queue = fresh
    .sort((a, b) => {
      const sources = (group: StoryGroup) => new Set(group.items.map((i) => i.source)).size;
      return (
        sources(b) - sources(a) ||
        Math.max(...b.items.map((i) => i.publishedAt.getTime())) -
          Math.max(...a.items.map((i) => i.publishedAt.getTime()))
      );
    })
    .slice(0, MAX_ARTICLES_PER_RUN);

  const actor = await getAutomationActor();

  for (const group of queue) {
    try {
      const context: ComposeContext = {
        sources: group.items.map((item) => item.source),
        clubStanding: await describeStanding(group.story.club),
        fromClubStanding: await describeStanding(group.story.fromClub),
      };

      const article = composeArticle(group.story, context);
      if (!article) continue;

      // The story's own publication time, not ours.
      const publishedAt = new Date(
        Math.min(...group.items.map((item) => item.publishedAt.getTime())),
      );

      const created = await Article.create({
        category: article.category,
        title: article.title,
        slug: await uniqueSlug(Article, article.title),
        excerpt: article.excerpt,
        body: article.body,
        image: null,
        publishedAt,
        authorId: actor.id,
        autoGenerated: true,
        // Credited because these outlets reported the underlying facts — and for an
        // unconfirmed claim, who is making it is itself part of the story.
        sources: [
          ...new Map(
            group.items.map((item) => [item.source, { name: item.source, url: item.link }]),
          ).values(),
        ],
        // Both the event key (dedupe across publishers and runs) and each item's own id, so
        // a later headline about the same event can't start a second article.
        sourceGuids: [group.key, ...group.items.map((item) => item.guid)],
      });

      await logAudit({
        actor,
        action: "create",
        entityType: "Article",
        entityId: String(created._id),
        summary: `Auto-published ${created.category.toLowerCase()} article “${created.title}” from facts reported by ${[
          ...new Set(group.items.map((i) => i.source)),
        ].join(" and ")}`,
        after: created,
      });

      result.published += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Could not publish “${group.items[0]?.title ?? group.key}”:`, error);
    }
  }

  if (result.published > 0) revalidateContent("article", "/admin/articles");

  console.log(
    `News articles: ${result.feedItems} feed items, ${result.stories} distinct stories, ` +
      `${result.alreadyCovered} already covered, ${result.published} published, ${result.failed} failed.`,
  );

  return result;
}
