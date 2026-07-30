import { loadEnvConfig } from "@next/env";

// Must run before anything reads process.env.
loadEnvConfig(process.cwd());

/**
 * Shows what the content automation would publish, without writing anything.
 *
 * Two halves, both pure JavaScript with no API cost:
 *   1. Headlines from the football feeds, shown as links out.
 *   2. Match reports and a results round-up, generated from finished matches.
 *
 *   npm run news:dry-run              # headlines + reports from live data
 *   npm run news:dry-run -- --samples # also print generated prose for made-up scorelines
 *
 * Reads the real feeds and the real database. Never writes.
 */

async function main() {
  const showSamples = process.argv.includes("--samples");

  // ---- Headlines ----

  const { fetchFeedItems, NEWS_FEEDS } = await import("@/lib/feeds/rss");

  console.log(`Reading ${NEWS_FEEDS.length} feeds…`);
  const items = await fetchFeedItems({ withinHours: 12 });

  const bySource = new Map<string, number>();
  for (const item of items) bySource.set(item.source, (bySource.get(item.source) ?? 0) + 1);

  console.log(`\n${items.length} headlines in the last 12 hours:`);
  for (const [source, count] of bySource) console.log(`  ${source}: ${count}`);

  const unique = new Map(items.map((item) => [item.guid, item]));
  console.log(`\n${unique.size} unique stories would appear under "Around the Web":\n`);
  for (const item of [...unique.values()].slice(0, 10)) {
    console.log(`  [${item.suggestedCategory}] (${item.source}) ${item.title}`);
  }

  // ---- Match reports ----

  const { generateMatchReport, isReportWorthy } = await import("@/lib/reports/match-report");
  const { generateResultsRoundup } = await import("@/lib/reports/results-roundup");

  // Wrapped so an unreachable database (paused Atlas cluster, un-whitelisted IP) still
  // lets the generated-prose samples below print — those are the part worth reviewing,
  // and they need no data at all.
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

    const { dbConnect } = await import("@/lib/db");
    const { Match } = await import("@/lib/models/match");

    await dbConnect();

    const since = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const finished = await Match.find({
      status: "finished",
      kickoffAt: { $gte: since },
      externalId: { $ne: null },
    })
      .sort({ kickoffAt: -1 })
      .lean();

    console.log(`\n${"─".repeat(72)}`);
    console.log(`${finished.length} finished matches in the last 36 hours.`);

    const facts = finished
      .map((match) => ({
        competition: match.competition,
        home: match.home,
        away: match.away,
        homeScore: Number(match.homeScore),
        awayScore: Number(match.awayScore),
        halfTimeHome: match.halfTimeHome ?? null,
        halfTimeAway: match.halfTimeAway ?? null,
        matchday: match.matchday ?? null,
        kickoffAt: match.kickoffAt,
      }))
      .filter((f) => Number.isInteger(f.homeScore) && Number.isInteger(f.awayScore));

    const worthy = facts.filter(isReportWorthy);
    console.log(`${worthy.length} of them warrant a standalone report.\n`);

    for (const fact of worthy.slice(0, 3)) {
      const report = generateMatchReport(fact);
      console.log("─".repeat(72));
      console.log(report.title);
      console.log("─".repeat(72));
      console.log(report.body);
      console.log();
    }

    const roundup = generateResultsRoundup(facts, facts[0]?.kickoffAt ?? new Date());
    if (roundup) {
      console.log("─".repeat(72));
      console.log(roundup.title);
      console.log("─".repeat(72));
      console.log(roundup.body);
    }

    await (await import("mongoose")).default.disconnect();
  } catch (error) {
    console.log(
      `\nSkipping the live match-report preview: ${
        error instanceof Error ? error.message.split("\n")[0] : "database unavailable"
      }`,
    );
  }

  // ---- Synthetic samples ----

  if (!showSamples) {
    console.log("\nPass --samples to see how each kind of result reads.");
    return;
  }

  console.log(`\n${"═".repeat(72)}`);
  console.log("Generated prose for each result shape:");
  console.log("═".repeat(72));

  const samples = [
    { label: "comeback", home: "Arsenal", away: "Chelsea", ft: [3, 2], ht: [0, 2] },
    { label: "held on", home: "Liverpool", away: "Everton", ft: [1, 0], ht: [1, 0] },
    { label: "second half", home: "Real Madrid", away: "Sevilla", ft: [2, 0], ht: [0, 0] },
    { label: "emphatic", home: "Bayern", away: "Union Berlin", ft: [5, 0], ht: [3, 0] },
    { label: "goalless draw", home: "Inter", away: "Roma", ft: [0, 0], ht: [0, 0] },
    { label: "score draw", home: "PSG", away: "Lyon", ft: [2, 2], ht: [1, 1] },
    { label: "goal glut", home: "Santos", away: "Chapecoense", ft: [4, 3], ht: [1, 2] },
  ];

  for (const sample of samples) {
    const report = generateMatchReport({
      competition: "Premier League",
      home: sample.home,
      away: sample.away,
      homeScore: sample.ft[0],
      awayScore: sample.ft[1],
      halfTimeHome: sample.ht[0],
      halfTimeAway: sample.ht[1],
      matchday: 21,
      kickoffAt: new Date("2026-07-25T14:00:00Z"),
    });

    console.log(`\n[${sample.label}]  ${report.title}`);
    console.log(report.body.replace(/^/gm, "    "));
  }

  // The round-up is a whole separate article type, so it gets its own sample — a
  // realistic mixed day across three competitions.
  const day = new Date("2026-07-25T14:00:00Z");
  const roundupSample = generateResultsRoundup(
    [
      ["Premier League", "Arsenal", "Chelsea", 3, 2, 0, 2, "12:30"],
      ["Premier League", "Liverpool", "Everton", 1, 0, 1, 0, "15:00"],
      ["Premier League", "Brighton", "Newcastle", 2, 2, 1, 0, "15:00"],
      ["La Liga", "Real Madrid", "Sevilla", 2, 0, 0, 0, "18:00"],
      ["La Liga", "Barcelona", "Valencia", 5, 1, 3, 0, "20:00"],
      ["Serie A", "Inter", "Roma", 0, 0, 0, 0, "17:00"],
    ].map(([competition, home, away, hs, as_, hth, hta, time]) => ({
      competition: competition as string,
      home: home as string,
      away: away as string,
      homeScore: hs as number,
      awayScore: as_ as number,
      halfTimeHome: hth as number,
      halfTimeAway: hta as number,
      matchday: 21,
      kickoffAt: new Date(`2026-07-25T${time as string}:00Z`),
    })),
    day,
  );

  if (roundupSample) {
    console.log(`\n${"═".repeat(72)}`);
    console.log("Daily results round-up:");
    console.log("═".repeat(72));
    console.log(`\n${roundupSample.title}\n`);
    console.log(roundupSample.body.replace(/^/gm, "    "));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
