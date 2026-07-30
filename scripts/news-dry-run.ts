import { loadEnvConfig } from "@next/env";

// Must run before anything reads process.env.
loadEnvConfig(process.cwd());

/**
 * Shows what the news pipeline would publish, without writing anything.
 *
 * Worth running before switching `NEWS_AUTOMATION` on, and any time the feeds or the
 * drafting prompt change — articles publish without review, so this is the place to
 * see what that will actually look like.
 *
 *   npm run news:dry-run           # feeds and clustering only, no Claude spend
 *   npm run news:dry-run -- --draft  # also draft the top story, printing it in full
 *
 * Reads the real feeds and hits the real Claude API with --draft. Never touches the
 * database.
 */

async function main() {
  const { fetchFeedItems, NEWS_FEEDS } = await import("@/lib/feeds/rss");
  const { clusterFeedItems } = await import("@/lib/feeds/cluster");

  const shouldDraft = process.argv.includes("--draft");

  console.log(`Reading ${NEWS_FEEDS.length} feeds…`);
  const items = await fetchFeedItems({ withinHours: 12 });

  const bySource = new Map<string, number>();
  for (const item of items) bySource.set(item.source, (bySource.get(item.source) ?? 0) + 1);

  console.log(`\n${items.length} items in the last 12 hours:`);
  for (const [source, count] of bySource) console.log(`  ${source}: ${count}`);

  if (items.length === 0) {
    console.log("\nNothing to do. Either the feeds are quiet or a fetch failed above.");
    return;
  }

  const clusters = clusterFeedItems(items);
  const merged = clusters.filter((cluster) => cluster.items.length > 1);

  console.log(`\n${clusters.length} distinct stories (${merged.length} reported more than once).`);

  // Same ordering the real run uses: corroborated stories first, then most recent.
  const queue = clusters.sort(
    (a, b) =>
      b.sources.length - a.sources.length || b.publishedAt.getTime() - a.publishedAt.getTime(),
  );

  console.log("\nStories the next run would consider, in order:\n");
  queue.slice(0, 12).forEach((cluster, index) => {
    const marker = index < 4 ? "→" : " ";
    console.log(
      `${marker} [${cluster.category}] ${cluster.items[0].title}` +
        `\n    ${cluster.items.length} report(s) from ${cluster.sources.join(" + ")}`,
    );
  });
  console.log("\n(→ marks the four a run would actually publish.)");

  if (!shouldDraft) {
    console.log("\nPass --draft to also draft the top story and print it.");
    return;
  }

  const { draftArticle, isDrafterConfigured } = await import("@/lib/ai/draft-article");

  if (!isDrafterConfigured()) {
    console.log("\nANTHROPIC_API_KEY is not set, so drafting is skipped.");
    return;
  }

  console.log("\nDrafting the top story…\n");
  const draft = await draftArticle(queue[0]);

  if (!draft) {
    console.log("The drafter declined this story — see the reason logged above.");
    return;
  }

  console.log("─".repeat(72));
  console.log(`CATEGORY  ${draft.category}`);
  console.log(`HEADLINE  ${draft.title}`);
  console.log(`EXCERPT   ${draft.excerpt}`);
  console.log("─".repeat(72));
  console.log(draft.body);
  console.log("─".repeat(72));
  console.log("\nSource headlines, for comparison — the draft above should share the");
  console.log("facts and none of the phrasing:\n");
  for (const item of queue[0].items) console.log(`  (${item.source}) ${item.title}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
