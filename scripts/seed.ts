/**
 * Seeds the database with starter content plus a bootstrap admin account, so a
 * fresh install has something to render and someone who can sign in.
 *
 *   npm run seed            # create the admin; seed content only if collections are empty
 *   npm run seed -- --reset # wipe and re-seed all content collections (never users)
 *
 * Safe to re-run: the admin is upserted by email, and content is left alone unless
 * --reset is passed, so an accidental second run can't destroy real content.
 */
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

import { dbConnect } from "../src/lib/db";
import { User } from "../src/lib/models/user";
import { Article } from "../src/lib/models/article";
import { Tip } from "../src/lib/models/tip";
import { Highlight } from "../src/lib/models/highlight";
import { Match } from "../src/lib/models/match";
import { StandingRow } from "../src/lib/models/standing-row";
import { DEFAULT_COMPETITION } from "../src/lib/constants";
import { slugify } from "../src/lib/slug";

const RESET = process.argv.includes("--reset");

/** Hours/days ago relative to now, so relative timestamps read sensibly after seeding. */
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local to create the bootstrap admin.",
    );
  }
  if (ADMIN_PASSWORD.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
  }

  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email }).lean();

  if (existing) {
    console.log(`✓ Admin already exists (${email}) — leaving password untouched.`);
    return existing._id;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await User.create({
    name: ADMIN_NAME || "Site Owner",
    email,
    passwordHash,
    role: "admin",
  });

  console.log(`✓ Created admin: ${email}`);
  return admin._id;
}

const ARTICLES = [
  {
    category: "Transfer" as const,
    title: "Mbappé completes move to Real Madrid",
    excerpt:
      "The France captain has signed a five-year deal at the Bernabéu, ending one of the longest-running sagas in modern football.",
    body: `Kylian Mbappé has completed his long-anticipated move to Real Madrid, signing a five-year contract that ties him to the Spanish capital until 2031.

The transfer brings to a close a pursuit that stretched across three seasons, with Madrid having twice previously seen approaches rebuffed. Mbappé arrives on a free transfer following the expiry of his Paris Saint-Germain contract, a scenario that PSG spent the better part of two years attempting to avoid.

"This is the club I dreamed of playing for as a boy," Mbappé said at his presentation, held in front of a capacity crowd. "I know what is expected here. I am ready for it."

He becomes the centrepiece of a forward line that already features Vinícius Júnior and Rodrygo, presenting head coach Carlo Ancelotti with an enviable but genuinely complex selection problem. Early indications from training suggest Mbappé will operate centrally, with Vinícius retaining the left flank he has made his own.

For PSG, the departure marks the end of an era defined as much by commercial spectacle as by sporting achievement. The Parisians have moved quickly in the market, though replacing 256 goals in 308 appearances is not a task any single signing will accomplish.`,
    publishedAt: hoursAgo(2),
    featured: false,
  },
  {
    category: "News" as const,
    title: "Premier League confirms new VAR protocol",
    excerpt:
      "Semi-automated offside technology and in-stadium announcements will be introduced from next season following a unanimous club vote.",
    body: `The Premier League has confirmed a significant overhaul of its video assistant referee protocol, with changes approved unanimously at a meeting of all twenty clubs.

The headline change is the introduction of semi-automated offside technology, which uses optical tracking to determine offside positions without manual line-drawing. The league expects the system to cut the average offside review from around 70 seconds to roughly 30.

Also arriving is a commitment to in-stadium announcements. Referees will explain overturned decisions directly to supporters inside the ground, a practice already familiar to viewers of major international tournaments.

"Supporters have been clear that the issue is not simply accuracy, it is the experience of waiting without explanation," a league spokesperson said. "These changes address both."

Not every proposal passed. A suggested trial of manager challenges, allowing each side two reviews per match, was withdrawn before a vote after what were described as "substantial reservations" from a majority of clubs.

The new protocol takes effect from the opening weekend of next season, with referees beginning familiarisation work during the summer.`,
    publishedAt: hoursAgo(4),
    featured: false,
  },
  {
    category: "Transfer" as const,
    title: "Saka signs new long-term deal with Arsenal",
    excerpt:
      "The academy graduate has committed his future to the club until 2030, becoming one of the highest earners in the squad.",
    body: `Bukayo Saka has signed a new long-term contract with Arsenal, committing his future to the club he joined as an eight-year-old until the summer of 2030.

The deal makes the winger one of the highest earners at the Emirates and ends speculation that had begun to build with two years remaining on his previous terms.

"I have been here since I was a child. This club raised me," Saka said. "There was never a moment where I wanted to be anywhere else. I want to win things here, with these players, in front of these fans."

Saka has been the most consistent attacking presence of Arsenal's recent resurgence, contributing at a rate few players in Europe can match while rarely missing a match. His durability has been remarkable given the physical attention he routinely receives.

Manager Mikel Arteta described the signing as "the most important piece of business we will do this year, and we haven't spent a penny on it."

The renewal continues a pattern of Arsenal securing their core rather than rebuilding around it, following comparable extensions for several of the squad's other key figures.`,
    publishedAt: hoursAgo(6),
    featured: false,
  },
  {
    category: "News" as const,
    title: "Champions League draw: what to expect",
    excerpt:
      "With the expanded league phase now settled, we break down the fixtures that matter and the sides facing the toughest road.",
    body: `The Champions League league-phase draw has been completed, and the expanded format has produced the kind of fixture list that would have been unthinkable under the old group system.

Each side now plays eight different opponents rather than facing three teams twice. The top eight advance directly to the round of sixteen; sides finishing ninth to twenty-fourth enter a two-legged playoff, and everyone below is eliminated outright.

The immediate consequence is that there are far fewer dead rubbers. Under the previous format, a side could effectively qualify with two matches to spare. Now, the difference between eighth and ninth — a direct route versus two extra high-stakes matches — will be contested until the final round.

Early analysis suggests the most demanding schedule belongs to the sides drawn against multiple opponents from the top seeding pot, with several facing three former winners across their eight fixtures.

For the neutral, the format's real gift is variety: more distinct pairings, more first-time meetings, and a table that stays meaningful deep into the calendar.`,
    publishedAt: hoursAgo(8),
    featured: false,
  },
  {
    category: "News" as const,
    title: "Arsenal on the brink of a statement win",
    excerpt:
      "Bukayo Saka's first-half double has the Emirates rocking as Arsenal push for a statement win over Chelsea.",
    body: `Bukayo Saka's first-half double has Arsenal on the verge of the kind of result that defines a title campaign.

The winger struck twice inside twenty-five minutes, the second a curling effort from the edge of the box that left the visiting goalkeeper motionless. The Emirates has not sounded like this in some time.

Chelsea responded after the break and have had spells of genuine control, halving the deficit with a little over twenty minutes remaining. But Arsenal have looked the more purposeful side throughout, pressing with an intensity that has repeatedly forced errors in dangerous areas.

With the match entering its final quarter, the home side are managing the game rather than merely defending it — a distinction that reflects real maturity from a squad that has occasionally struggled to close out matches of this magnitude.

A win here would be a statement, both in points and in tone.`,
    publishedAt: hoursAgo(1),
    featured: true,
    heroEyebrow: "Matchday · 76' Live",
    heroHeadline: "Arsenal on the brink of a statement win",
    heroHeadlineAccent: "statement win",
    heroDescription:
      "Bukayo Saka's first-half double has the Emirates rocking as Arsenal push for a statement win over Chelsea in today's marquee Premier League fixture.",
    heroPrimaryCtaLabel: "Watch Highlights",
    heroPrimaryCtaHref: "/highlights",
    heroSecondaryCtaLabel: "Read Match Report",
    heroSecondaryCtaHref: "",
  },
];

const TIPS = [
  {
    competition: "Premier League",
    kickoffAt: hoursFromNow(3),
    fixture: "Man United vs Liverpool",
    pick: "Over 2.5 Goals",
    odds: "1.85",
    confidence: 3,
    result: "pending" as const,
  },
  {
    competition: "Serie A",
    kickoffAt: hoursFromNow(5),
    fixture: "Napoli vs Inter Milan",
    pick: "Both Teams to Score",
    odds: "1.72",
    confidence: 2,
    result: "pending" as const,
  },
  {
    competition: "Eredivisie",
    kickoffAt: hoursFromNow(6),
    fixture: "Ajax vs PSV",
    pick: "Ajax to Win",
    odds: "2.10",
    confidence: 4,
    result: "pending" as const,
  },
  // Yesterday's settled tips — these drive the trust strip (4 wins, 1 loss) and
  // the aggregated win-rate figure, which is computed from these results.
  {
    competition: "Premier League",
    kickoffAt: hoursAgo(26),
    fixture: "Man City vs Everton",
    pick: "Man City -1 Handicap",
    odds: "1.80",
    confidence: 4,
    result: "won" as const,
  },
  {
    competition: "La Liga",
    kickoffAt: hoursAgo(27),
    fixture: "Girona vs Sevilla",
    pick: "Over 1.5 Goals",
    odds: "1.40",
    confidence: 4,
    result: "won" as const,
  },
  {
    competition: "Bundesliga",
    kickoffAt: hoursAgo(28),
    fixture: "Leverkusen vs Freiburg",
    pick: "Leverkusen to Win",
    odds: "1.55",
    confidence: 3,
    result: "won" as const,
  },
  {
    competition: "Serie A",
    kickoffAt: hoursAgo(29),
    fixture: "Juventus vs Lazio",
    pick: "Both Teams to Score",
    odds: "1.90",
    confidence: 2,
    result: "won" as const,
  },
  {
    competition: "Ligue 1",
    kickoffAt: hoursAgo(30),
    fixture: "Lyon vs Nice",
    pick: "Over 2.5 Goals",
    odds: "1.95",
    confidence: 2,
    result: "lost" as const,
  },
];

const HIGHLIGHTS = [
  { title: "Haaland's hat-trick vs Everton", durationSeconds: 134, publishedAt: hoursAgo(3) },
  { title: "Bellingham's stunner from range", durationSeconds: 48, publishedAt: hoursAgo(9) },
  { title: "Top 5 goals of the week", durationSeconds: 182, publishedAt: hoursAgo(20) },
];

const MATCHES = [
  {
    competition: "Premier League",
    home: "Arsenal",
    away: "Chelsea",
    homeScore: "2",
    awayScore: "1",
    status: "live" as const,
    meta: "76'",
    kickoffAt: hoursAgo(1.5),
  },
  {
    competition: "La Liga",
    home: "Real Madrid",
    away: "Barcelona",
    homeScore: "0",
    awayScore: "0",
    status: "live" as const,
    meta: "34'",
    kickoffAt: hoursAgo(0.75),
  },
  {
    competition: "Premier League",
    home: "Man City",
    away: "Everton",
    homeScore: "3",
    awayScore: "0",
    status: "finished" as const,
    meta: "FT",
    kickoffAt: hoursAgo(4),
  },
  {
    competition: "Bundesliga",
    home: "Bayern",
    away: "Dortmund",
    homeScore: "–",
    awayScore: "–",
    status: "upcoming" as const,
    meta: "Today 20:00",
    kickoffAt: hoursFromNow(4),
  },
  {
    competition: "Ligue 1",
    home: "PSG",
    away: "Marseille",
    homeScore: "–",
    awayScore: "–",
    status: "upcoming" as const,
    meta: "Today 21:00",
    kickoffAt: hoursFromNow(5),
  },
];

// goalsFor/goalsAgainst chosen to produce the goal differences the table displays.
const STANDINGS = [
  { pos: 1, team: "Liverpool", played: 24, goalsFor: 52, goalsAgainst: 21, points: 58, qualifying: true },
  { pos: 2, team: "Arsenal", played: 24, goalsFor: 48, goalsAgainst: 21, points: 54, qualifying: true },
  { pos: 3, team: "Man City", played: 24, goalsFor: 50, goalsAgainst: 26, points: 51, qualifying: true },
  { pos: 4, team: "Chelsea", played: 24, goalsFor: 41, goalsAgainst: 26, points: 45, qualifying: false },
  { pos: 5, team: "Newcastle", played: 24, goalsFor: 38, goalsAgainst: 27, points: 42, qualifying: false },
];

async function seedContent(authorId: mongoose.Types.ObjectId) {
  // Typed loosely on purpose: iterating a heterogeneous set of models is the one
  // place Mongoose's per-model generics get in the way rather than help.
  const collections: Array<{ model: mongoose.Model<never>; name: string }> = [
    { model: Article as unknown as mongoose.Model<never>, name: "articles" },
    { model: Tip as unknown as mongoose.Model<never>, name: "tips" },
    { model: Highlight as unknown as mongoose.Model<never>, name: "highlights" },
    { model: Match as unknown as mongoose.Model<never>, name: "matches" },
    { model: StandingRow as unknown as mongoose.Model<never>, name: "standings" },
  ];

  if (RESET) {
    for (const { model, name } of collections) {
      const { deletedCount } = await model.deleteMany({});
      console.log(`  cleared ${deletedCount} ${name}`);
    }
  } else {
    const counts = await Promise.all(collections.map(({ model }) => model.countDocuments()));
    const existing = counts.reduce((sum, n) => sum + n, 0);
    if (existing > 0) {
      console.log(
        `✓ Content already present (${existing} documents) — skipping. Use --reset to wipe and re-seed.`,
      );
      return;
    }
  }

  await Article.insertMany(
    ARTICLES.map((article) => ({ ...article, slug: slugify(article.title), authorId })),
  );
  console.log(`✓ Seeded ${ARTICLES.length} articles (1 featured as the homepage hero)`);

  await Tip.insertMany(TIPS.map((tip) => ({ ...tip, authorId })));
  console.log(`✓ Seeded ${TIPS.length} tips (3 pending, 4 won, 1 lost)`);

  await Highlight.insertMany(HIGHLIGHTS);
  console.log(`✓ Seeded ${HIGHLIGHTS.length} highlights`);

  await Match.insertMany(MATCHES);
  console.log(`✓ Seeded ${MATCHES.length} ticker matches`);

  await StandingRow.insertMany(
    STANDINGS.map((row) => ({ ...row, competition: DEFAULT_COMPETITION })),
  );
  console.log(`✓ Seeded ${STANDINGS.length} standings rows`);
}

async function main() {
  console.log(RESET ? "Seeding database (--reset)…\n" : "Seeding database…\n");

  await dbConnect();
  // Build indexes now so the partial-unique featured constraint is live before
  // the CMS starts writing articles.
  await Promise.all([
    Article.syncIndexes(),
    Tip.syncIndexes(),
    Highlight.syncIndexes(),
    Match.syncIndexes(),
    StandingRow.syncIndexes(),
    User.syncIndexes(),
  ]);

  const adminId = await seedAdmin();
  await seedContent(adminId as mongoose.Types.ObjectId);

  console.log("\nDone. Log in at /admin/login");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
