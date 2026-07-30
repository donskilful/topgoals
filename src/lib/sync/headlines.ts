import { dbConnect } from "@/lib/db";
import { SourceLink } from "@/lib/models/source-link";
import { fetchFeedItems } from "@/lib/feeds/rss";
import { revalidatePath } from "next/cache";

/**
 * Keeps the "around the web" headline list current from the football feeds.
 *
 * No prose is copied, generated or rewritten — only the headline, the publisher, the
 * link and the timestamp are stored, and the reader clicks through to the source. See
 * `src/lib/models/source-link.ts` for why that's the right shape without an LLM.
 *
 * The feed reader still does the useful filtering it did before: football-only by URL,
 * and no live blogs, paper reviews, rumour columns, opinion pieces or polls.
 */

/** Older headlines aren't useful and shouldn't accumulate forever. */
const RETAIN_DAYS = 14;

/** Wider than the cron interval so a missed run catches up on the next one. */
const LOOKBACK_HOURS = 24;

export type HeadlineSyncResult = {
  fetched: number;
  created: number;
  updated: number;
  pruned: number;
};

export async function syncHeadlines(): Promise<HeadlineSyncResult> {
  const items = await fetchFeedItems({ withinHours: LOOKBACK_HOURS });

  const result: HeadlineSyncResult = { fetched: items.length, created: 0, updated: 0, pruned: 0 };

  if (items.length === 0) return result;

  await dbConnect();

  // Upsert on the canonical guid: publishers do edit headlines after filing, and the
  // same story cross-filed to two feeds shares one guid, so this both de-duplicates and
  // keeps wording current.
  for (const item of items) {
    const outcome = await SourceLink.updateOne(
      { guid: item.guid },
      {
        $set: {
          source: item.source,
          title: item.title,
          url: item.link,
          category: item.suggestedCategory,
          publishedAt: item.publishedAt,
        },
        $setOnInsert: { guid: item.guid },
      },
      { upsert: true },
    );

    if (outcome.upsertedCount > 0) result.created += 1;
    else if (outcome.modifiedCount > 0) result.updated += 1;
  }

  const cutoff = new Date(Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000);
  const pruned = await SourceLink.deleteMany({ publishedAt: { $lt: cutoff } });
  result.pruned = pruned.deletedCount ?? 0;

  if (result.created > 0 || result.updated > 0) {
    try {
      // These appear on the homepage and both list pages.
      for (const path of ["/", "/news", "/transfers"]) revalidatePath(path);
    } catch {
      // Outside a request context (scripts, tests) — not worth failing a sync over.
    }
  }

  return result;
}
