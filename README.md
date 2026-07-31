# TopGoals ⚽

A fast, mobile-first football (soccer) hub — live scores, daily betting tips with
tracked results, transfer news, sports news, and goals & highlights, all built to
feel instant even on a poor connection.

> **Status:** The CMS is complete, the public site runs on real data, and scores, tables,
> match reports and news/transfer articles all update automatically — no LLM anywhere.

## Why this stack

Built on a modern, fast-by-default flavor of MERN: Next.js instead of a plain
CRA/Express-rendered React app, so the same team knowledge (React, Node, MongoDB
later) is kept, but with server rendering, automatic code-splitting, and built-in
image optimization out of the box — the things that matter most for a sports/betting
audience on mobile, often on weak connections.

| Concern                            | Why it's handled here                                                    |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Fast first paint on slow networks   | The homepage is prerendered static HTML, regenerated in the background   |
| Mobile-first, native-app feel       | Fixed bottom tab bar on mobile, fully responsive down to 375px            |
| No wasted bytes                     | Hero illustration is pure CSS/SVG — zero image assets to download         |
| Fonts                               | Self-hosted via `next/font` (Anton, Inter, JetBrains Mono) — no external font requests |

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` config, no `tailwind.config.js` needed)
- **Fonts:** Anton (display), Inter (body), JetBrains Mono (scores/odds/data)
- **Database:** MongoDB Atlas + Mongoose
- **Auth:** Auth.js v5 (credentials + JWT sessions)
- **Media:** Cloudinary, signed uploads straight from the browser
- **Live scores & tables:** football-data.org, polled by Vercel Cron
- **Automated content:** JS-generated match reports and news/transfer articles, no LLM
- **Planned:** Redis caching, PWA layer

## Design system

Dark "stadium-under-lights" identity:

- **Ink** `#0a0d0c` — background
- **Charcoal** `#141918` / `#1b211f` / `#232a27` — surfaces, cards, elevation
- **Floodlight** `#f3f5f0` — primary text (warm white, not pure white)
- **Torch** `#f5b942` — gold accent, primary CTAs, tips
- **Pitch** `#16a35e` / `#22c974` — wins, live/fresh indicators
- **Whistle** `#ff4757` — live match indicator, losses (used sparingly, always means "urgent/current")

Signature elements: a live scoreboard ticker (LED-style mono digits) as the
homepage's opening moment, and a CSS/SVG-illustrated athlete silhouette in the
hero instead of stock photography.

A static HTML/CSS design reference lives in [`design/homepage-mockup.html`](design/homepage-mockup.html) —
open it directly in a browser to see the original design pass this build was ported from.

## Getting started

```bash
npm install
cp .env.example .env.local
```

Then fill in `.env.local`:

1. **`MONGODB_URI`** — create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster,
   then *Connect → Drivers* and copy the connection string. URL-encode any special
   characters in the password, and add your IP under *Network Access*.
2. **`AUTH_SECRET`** — generate one with `npx auth secret`.
3. **`ADMIN_EMAIL` / `ADMIN_PASSWORD`** — the first admin account, created by the seed
   step below. Change the password after your first sign-in.
4. **Cloudinary keys** — from your Cloudinary dashboard (*Settings → API Keys*).
   Needed for article images and highlight videos.
5. **`FOOTBALL_DATA_API_KEY`** — free, no card, instant:
   [football-data.org/client/register](https://www.football-data.org/client/register).
   Enables automatic live scores. Optional — without it, scores are entered by hand.
6. **`CRON_SECRET`** — any long random string (`openssl rand -base64 32`). Guards both
   cron endpoints so nobody else can trigger them.
7. **`NEWS_AUTOMATION`** — set to `"on"` to enable generated match reports, news and
   transfer articles, and the headline list. Defaults to off. No API key needed; it's all
   plain JavaScript.

Seed the database with starter content and your admin account, then start the app:

```bash
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the site, or
[/admin/login](http://localhost:3000/admin/login) for the CMS.

```bash
npm run build            # production build
npm run lint             # ESLint
npm run seed             # create admin; seed content only if empty
npm run seed -- --reset  # wipe and re-seed content (never touches accounts)
```

## Live scores

Scores come from [football-data.org](https://www.football-data.org) — chosen because
its free tier is a permanent **10 requests/minute** across 12 competitions, rather
than a daily cap a live-score poller would exhaust within hours of a matchday.

Ten competitions are tracked: Premier League, La Liga, Serie A, Bundesliga, Ligue 1,
Champions League, Eredivisie, Primeira Liga, the Championship and Brazilian Série A.
One request covers all of them.

Vercel Cron hits `/api/cron/scores` every 5 minutes (see `vercel.json`), which matches
the homepage's own 60-second revalidation — polling faster would achieve nothing
visible. There's also a **Sync now** button in the CMS for forcing a refresh mid-match.

Three rules stop the feed and the CMS fighting each other:

1. **Fixtures are matched on `externalId`**, so repeated syncs update rows rather than
   duplicating them.
2. **Editing a synced match freezes it.** Feeds get scores wrong, and on a betting site
   a correction must not be silently reverted by the next poll — so a hand-edited
   fixture is flagged and skipped from then on. The matches list marks every row
   `auto`, `edited` or `manual`.
3. **The sync never deletes.** A provider outage can't empty the ticker, and
   competitions outside the free tier can still be added by hand.

## League tables

Tables sync from football-data.org every 15 minutes (`/api/cron/standings`), covering the
**Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and Brasileirão**.

`/scores` shows every table behind a switcher; the homepage widget shows one. Both are
labelled with the competition, and the switcher's tables all ship inside the page's static
HTML so changing league costs no request.

### A table is only published once its season has started

This guard exists because the provider is inconsistent before kick-off, in two different
ways — verified against all five European leagues on 30 July 2026, three weeks before the
2026/27 season:

| League | What the provider returned |
| --- | --- |
| Premier League, La Liga, Bundesliga | **Last season's final table** under the new season's metadata — 760 games played across 20 teams, i.e. 38 each |
| Serie A, Ligue 1 | A correctly zeroed new-season table with **all 20 teams at position 1** |

Publishing the first would have shown Arsenal on 85 points before a ball was kicked;
publishing the second renders as nonsense and, since qualification is derived from
position, marks every team a European qualifier. On a site with betting tips beside the
table, a table that looks current and isn't is a factual error a reader could act on — so
`isPublishableTable()` requires the season to have started, at least one game to have been
played, and positions to be distinct. Anything else is skipped with a logged reason, and
whatever is already stored is left alone.

Practical consequence: between May and mid-August only **Brasileirão** has a live table
(it runs February to December). That's why it's in the list — without it the tables sit
empty through the European summer. The European leagues start filling in from 7 August.

### Rows are matched on team, never position

Positions reshuffle on almost every sync, so the unique index is `{competition, team}`. It
used to be `{competition, pos}`, which looked equivalent and wasn't — two teams swapping
places produced a duplicate-key error, and re-ordering a table by hand in the CMS hit the
same wall. Teams that leave a table (promotion, relegation, a new season's line-up) are
removed after the upsert, so a table can shrink as well as grow.

### Not available on this provider

**MLS and the Saudi Pro League are not on football-data.org at any tier** — `/competitions`
returns exactly 13 for this key and both return HTTP 403. They need a second provider or
manual CMS entry; see `TODO.md`.

## Automated content

Two things are generated automatically, **both in plain JavaScript** — no language
model, no API key, no per-article cost. Vercel Cron hits `/api/cron/news` every two
hours.

### Match reports (our own writing)

Reports and a daily results round-up are generated from finished matches, using the
`football-data.org` data the score sync has **already** stored. That means zero extra
provider requests and nothing to rate-limit.

This works because of the difference between the two kinds of input:

> Turning **structured facts we hold** into sentences is templating. Turning **someone
> else's prose** into different prose is paraphrasing — a derivative of their writing
> however far the wording drifts.

So match reports are written here, and news stories are not (see below). It's the same
approach wire services have used for results and earnings for years.

**The free tier's ceiling, stated plainly:** it returns no scorers, no bookings and no
referees — only the scoreline, the half-time score, the competition and the matchday.
Every sentence is built from exactly that. Reports are therefore short and factual, and
never name who scored. Half-time versus full-time is the one narrative signal available,
so reports can legitimately describe a comeback, a game settled after the break, or a
side holding on — and nothing beyond that. Richer reports need a paid tier (see
`TODO.md`).

Standalone reports are reserved for results with something to say — a comeback, a 3+
goal margin, or 5+ goals — because with no scorers a routine 1-0 would be three
near-identical sentences. Everything else is covered by the daily round-up, grouped by
competition.

### News and transfer articles (also our own writing)

Articles are written from the *facts* in the feeds. Each headline is parsed into structured
data — who, which clubs, what happened, how certain it is — and the sentences are composed
from that structure. No source phrasing reaches the composer; `extract.ts` throws quoted
fragments away before returning.

Same principle as the match reports. Facts aren't copyrightable, the words used to report
them are, and "Chelsea signed Maxence Lacroix from Crystal Palace" is a fact anyone may
state.

**Certainty is never upgraded.** "Real Madrid *expected to make offer for* Rodri" is a
report of an intention, not a transfer, so it publishes as *"Real Madrid have been linked
with a move for Rodri … No deal has been confirmed by either club"* and credits the outlet
that made the claim. Readers here place bets; the difference between a club being linked
with a player and having signed one is money. Where a claim is unconfirmed, who is making
it is itself a material fact, so it's stated.

**Most headlines produce nothing, deliberately.** Q&As, pundit columns, features,
explainers and anything ambiguous are skipped rather than guessed at, and stay as link-outs
below. Expect a minority to become articles — a missed story costs nothing, a misread one
publishes a false statement under our name. In testing, 4 distinct stories came from 23 feed
items.

Two guards worth knowing about, both added after they produced a falsehood in testing:

- **Figures are read from the headline only, never the summary.** A Guardian summary covering
  two transfers at once ("Lacroix joins Chelsea as John Stones seals Inter deal") caused
  Stones' two-year contract to be attributed to Lacroix, who had signed for six years. A
  headline makes one claim about one subject; a summary does not.
- **League-position context comes only from tables the feed is actively maintaining.**
  Reading any stored row produced "Chelsea currently sit 4th on 45 points" from leftover
  seeded rows, before the season had started.

### Around the web (other people's headlines)

Everything that isn't extractable still appears as an attributed link list: headline,
publisher, timestamp, link out. No summary text is stored and no body is generated.

Crawling the sites was considered and rejected: Sky's `robots.txt` disallows bots, and
article prose and highlight video are licensed content.

### What's filtered out

Football-only, enforced by the article's own URL rather than by which feed carried it —
that's what stops a feed change leaking cricket back in. Also dropped, because none of
it belongs in a headline list or a report:

- Live blogs and rolling round-ups (`Transfer Centre LIVE!`, `Arsenal latest:`)
- Paper reviews, gossip and transfer-rumour columns — unconfirmed claims, which matter
  most to exclude on a site with betting tips beside them
- Opinion columns, identified by the Guardian's `… | Columnist Name` byline
- Quizzes, polls, podcasts and video-only items
- Anything with an unreadable date

### Images

Generated articles carry no photograph. `ArticleArtwork` draws an original card from the
site's own visual language — floodlit pitch geometry, seeded from the article slug, so
every story looks different and always looks the same. Reusing a publisher's photo would
be infringement, and watermarking one makes it worse rather than lawful: sports
photography is the most actively enforced category there is. Every article without an
uploaded image uses this, so hand-written ones benefit too.

### Before switching it on

`NEWS_AUTOMATION` must equal `"on"`. It defaults to off, so deploying the code doesn't
start publishing — and it's the kill switch, effective without a redeploy.

**Articles publish immediately; there is no review queue.** Guardrails are a cap of 6
reports per run, an `auto` badge in the CMS article list, and an audit entry attributed
to a `TopGoals Automation` account that cannot be signed into.

Preview a run without writing anything:

```bash
npm run news:dry-run             # live headlines + reports from real data
npm run news:dry-run -- --samples # how each kind of result reads
```

## Roles

| Role | Can do |
| --- | --- |
| **Administrator** | Everything — all content, reader messages, staff accounts, and the activity log |
| **Moderator** | Create and edit content, and handle reader messages. No access to staff accounts or the activity log |
| **User** | No CMS access. Scaffolded for future site accounts (favourites, notifications) — nothing uses it yet |

There is no public sign-up and no email invite flow: an administrator creates each
account with a temporary password and shares it directly.

## Project structure

```
src/
  auth.config.ts          # edge-safe Auth.js config (no DB/bcrypt) — imported by proxy.ts
  auth.ts                  # full Auth.js config with the Credentials provider
  proxy.ts                  # route protection for /admin (Next 16's middleware)
  app/
    layout.tsx              # fonts, metadata, root layout
    page.tsx                 # homepage assembly
    globals.css               # design tokens + Tailwind @theme
    admin/
      login/                 # sign-in page
      (dashboard)/           # role-gated CMS shell
        page.tsx               # overview + recent activity
        articles/ tips/ highlights/ matches/ standings/
        messages/              # contact form inbox
        users/                 # staff accounts (admin only)
        activity-log/          # audit trail
    scores/ tips/ news/ transfers/ highlights/
    articles/[slug]/         # article detail (SSG)
    contact/                 # public contact form
    about/ privacy/          # static, not CMS-managed
    api/auth/[...nextauth]/  # Auth.js route handler
    api/cloudinary/sign/     # issues signed upload signatures
    api/cron/scores/         # score sync, called by Vercel Cron
  components/
    site-header.tsx, hero.tsx, live-ticker.tsx, trust-strip.tsx,
    todays-picks.tsx, goals-highlights.tsx, latest-news.tsx,
    site-footer.tsx, mobile-tabbar.tsx, sidebar/*
    admin/                   # CMS nav, shared form fields, page chrome
  lib/
    constants.ts            # shared enums — NO server imports (safe for client + edge)
    errors.ts                # shared error types
    db.ts                     # cached Mongoose connection
    auth-helpers.ts            # requireRole / requireAdmin
    audit.ts                    # logAudit() — writes the who/what/when trail
    form-state.ts                # shared Server Action result shape
    cloudinary.ts                 # server-only Cloudinary client
    slug.ts                        # slug generation + uniqueness
    football-data.ts                # live-score provider client
    automation-actor.ts              # the non-loginable identity automated writes are logged as
    feeds/rss.ts                      # reads Sky/Guardian RSS; football-only, filters non-stories
    feeds/cluster.ts                   # groups reports of the same event
    news/extract.ts                     # headline -> structured facts, certainty preserved
    news/compose.ts                      # facts -> original prose, hedges honoured
    reports/match-report.ts               # JS templates -> original match-report prose
    reports/results-roundup.ts           # JS templates -> daily results round-up
    sync/matches.ts                       # score feed -> database upsert rules
    sync/standings.ts                      # league tables, with the season guard
    sync/reports.ts                        # finished matches -> published reports
    sync/headlines.ts                       # RSS -> attributed link list
    sync/news-articles.ts                    # RSS facts -> published articles
    models/                         # Mongoose schemas
    schemas/                         # Zod validation
    actions/                          # 'use server' mutations
    data/                    # read helpers for the public site (plain objects, no Mongoose docs)
    format.ts                 # relative time, clip length, kick-off formatting
scripts/
  seed.ts                   # starter content + bootstrap admin account
  news-dry-run.ts           # preview what the news pipeline would publish
design/
  homepage-mockup.html      # original static design reference
```

### Three rules worth knowing before adding code

1. **`lib/constants.ts` must never import Mongoose.** Client Components, Zod schemas
   and the edge proxy all import from it. Put shared enums there, not in a model file
   — importing a model from client code drags the whole ODM into the browser bundle
   and breaks the build.
2. **Every mutating Server Action must call `requireRole()` itself.** The proxy is a
   UX redirect, not the security boundary: Server Actions are directly POST-able once
   their action ID reaches the client bundle.

3. **Public read helpers degrade; the CMS must not.** Everything in `src/lib/data/` wraps
   its query in `publicRead()`, so an unreachable database renders the page with empty
   sections instead of a 500 — one sidebar widget failing shouldn't cost a reader the
   whole homepage. **Never** use that wrapper in the CMS or in a Server Action: an admin
   shown an empty article list would reasonably think their content had been deleted, and
   a mutation that swallowed a connection error would tell an editor their edit saved
   when it didn't. Those paths fail loudly on purpose.

## Roadmap

- [x] **Phase 0** — Brand & UI direction (dark stadium-under-lights identity)
- [x] **Phase 1** — Next.js scaffold, homepage ported to real components on mock data

**Phase 2 — CMS** ✅ complete

- [x] **2A** — MongoDB models, Auth.js with roles, seed script
- [x] **2B** — Admin shell, staff accounts CRUD, audit trail
- [x] **2C** — Content CRUD: articles, tips, highlights, scores, standings (+ Cloudinary uploads)
- [x] **2D** — Wire the public homepage to the database
- [x] **2E** — Public pages (`/scores`, `/tips`, `/news`, `/transfers`, `/highlights`, article detail), real navigation, About & Privacy

**Later**

- [ ] **Phase 3** — Live data: real-time score updates, caching layer
- [ ] **Phase 4** — Automation: third-party sports data API integration, scheduled jobs
- [ ] **Phase 5** — PWA, push notifications, public accounts, growth features

Planned work and known gaps are tracked in [TODO.md](TODO.md), written so anyone can
pick an item up without prior context.

### Known limitations

- **Live scores need a free API key.** Add `FOOTBALL_DATA_API_KEY` and scores update
  themselves every 5 minutes across 10 competitions. Without it, matches are still
  maintained by hand in the CMS, and `/scores` tells readers so.
- **No email.** Account creation hands over a temporary password out of band; there is
  no invite email or password-reset flow. Contact form messages land in the CMS inbox
  rather than an email inbox, so someone needs to check `/admin/messages`.
- **The contact form isn't rate-limited.** It's validated and honeypotted, but proper
  rate limiting needs shared state (Redis) that isn't in the stack yet. Submissions only
  ever appear in the private CMS, never on a public page.

## Progress log

Every push gets an entry here — what shipped and why, newest first.

### 2026-07-31 — Highlights read their own length and poster frame

Three fields on the highlight form that asked an editor for information the video already
carries:

- **Length is read from the clip.** Cloudinary returns a `duration` on the upload result, so
  uploading fills the field in. Still editable — the API doesn't always report one, and an
  editor may be featuring a trimmed section rather than the whole file.
- **The thumbnail is derived from the video.** Cloudinary renders any video as an image if
  you ask for an image extension, so a poster never needed uploading separately —
  `so_auto` picks a representative frame rather than frame zero, which on football footage is
  usually a blurry pan or blank pre-roll. The upload field stays as an override for when the
  automatic frame isn't the one you want.
- **Published already defaulted to now**; the field just never said so. It now does, along
  with why you'd change it.

The video upload moved above Length, since it's what fills it in.

### 2026-07-31 — News and transfer articles, still without an LLM

Transfer and news articles are now written in plain JavaScript by extracting the facts from
each headline and composing sentences from the structure — the same principle as the match
reports, applied to feed items. No source phrasing survives extraction, so nothing is a
paraphrase, and there's still no per-article cost.

- **Certainty is never upgraded.** A headline reporting an intention publishes as a report,
  credited to the outlet making it, with "No deal has been confirmed by either club" stated
  outright. On a site with betting tips beside it, "linked with" and "has signed" are
  different amounts of money.
- **Reports of the same event merge.** Keyed on the extracted facts rather than headline
  wording, so "Chelsea sign Lacroix from Palace" and "Maxence Lacroix joins Chelsea" become
  one article crediting both outlets — taking the selling club from one and the fuller name
  from the other.
- **Most headlines produce nothing on purpose** — 4 stories from 23 items in testing. Q&As,
  pundit columns, features and anything ambiguous stay as link-outs.

Three falsehoods caught in testing before any of this shipped:

- **A fabricated contract length.** A Guardian summary covering two transfers at once made
  John Stones' two-year deal read as Lacroix's, who had actually signed for six years. The
  two sources also disagreed on the fee (£51m vs £52m). Figures now come from the headline
  only — one claim, one subject.
- **A stale league position.** "Chelsea currently sit 4th on 45 points" was read off
  leftover seeded rows for a season that hadn't started. Context now comes only from tables
  the feed is actively maintaining.
- **A junk capture becoming prose.** A loose pattern matched "Makhanya seals Rangers move
  from MLS" first and captured "Rangers move" as the player; the guard then abandoned the
  whole headline instead of trying the next pattern. Now a bad capture just means that
  pattern misread it.

Also fixed: my own composer guard used `\s{2,}` to catch doubled spaces, which also matched
the `\n\n` between paragraphs and silently rejected every article the module produced.

### 2026-07-31 — "Around the Web" fixed on mobile and made the transfer entry point

- **The heading wrapped onto two lines on a phone.** Title and caption shared a row, so the
  caption stole enough width to break "Around the Web" in half — and at 26px display type a
  wrapped heading dominated the screen. Stacked now, with the caption in italics beneath.
  Verified at 412px: one line, no horizontal overflow.
- **Added "More transfer news" and "More news" links below the list.** With no transfer
  articles being generated, this block *is* the site's transfer coverage, so it needed a
  route into the fuller per-category lists. Shown on the homepage only — `/news` and
  `/transfers` already are the fuller view.

### 2026-07-31 — Placeholder content removed, real content in

The five seeded articles ("Mbappé completes move to Real Madrid", "Saka signs new
long-term deal", and so on) were invented sample copy with no source behind them. They are
deleted, with audit entries recording why, and the site now runs entirely on real data:
21 headlines pulled from Sky Sports and Guardian Football, plus generated match reports
from actual Brasileirão results.

Fixes that came out of reading the first real generated output:

- **Verb strength now matches the margin.** A 4-0 headlined "sweep aside" opened with "got
  the better of" — the two sentences read like different matches.
- **One league, one name.** The same competition was "Brasileirão" on the standings tab and
  "Campeonato Brasileiro Série A" in reports and the ticker, where it truncated to
  "CAMPEONATO B..." and told the reader nothing. Provider names are normalised on ingest.
- **Half-time scores were missing from existing fixtures**, so the first report was two flat
  sentences. Backfilled by the score sync; reports now carry the half-time narrative they
  were designed around.
- **The hero no longer goes blank.** It falls back to the newest article when nothing is
  explicitly featured — which is exactly the state the site was in the moment placeholder
  content was cleared.
- Silenced a Mongoose 9 deprecation (`new: true` → `returnDocument: "after"`).

**Known gap, and it's a real one:** nothing generates *transfer articles* any more. Removing
the LLM removed the only mechanism that could legitimately write prose about a story that
only exists as another publisher's prose. Transfers are therefore a link list ("Around the
Web") until that's revisited — see `TODO.md` item 2.

### 2026-07-31 — League tables sync themselves

The table was the last thing on the site still maintained by hand, and it sat on the
homepage beside automatically-updating live scores looking equally live. It now syncs from
football-data.org every 15 minutes across the Premier League, La Liga, Serie A, Bundesliga,
Ligue 1 and Brasileirão, with a switcher on `/scores`.

- **Tables are refused until their season starts**, because the provider is inconsistent
  before kick-off in two different ways. Checked against all five European leagues: three
  returned *last season's final table* under the new season's metadata (760 games played
  across 20 teams), and two returned zeroed tables with all 20 teams at position 1. The
  first would have published Arsenal on 85 points before a ball was kicked; the second
  marks every team a European qualifier, since qualification comes from position.
- **Brasileirão is in the list for a practical reason** — it runs February to December, so
  it's the only major league with a live table through the European summer. Without it the
  tables would be empty until August.
- **Rows are matched on team, not position.** The unique index moved from
  `{competition, pos}` to `{competition, team}`: positions reshuffle on nearly every sync,
  so the old key errored the moment two teams swapped places, and `syncIndexes()` drops the
  stale index on existing databases.
- **`getStandings()` was querying every row and sorting by position** — fine with one
  league, and with five it would have interleaved five different teams all at position 1
  into a single nonsense table.
- **The homepage widget and the switcher now lead with a table the feed is updating**, so
  neither presents leftover or hand-seeded rows as current standings.
- **A rate limit counts as a skip, not a failure.** Six competitions is six requests
  against a 10-per-minute budget shared with the score sync; a throttle is expected and
  transient, and reporting it as a failure made the cron cry wolf.
- **Three pieces of copy were lying.** "Scores are updated manually by our team" predated
  the score sync; "Posted daily by 09:00 GMT" contradicted the site's GMT+1 pinning
  everywhere else; "Clipped within minutes of full time" claimed an automation that
  doesn't exist, since highlights are still manual.
- **MLS and the Saudi Pro League were asked for and aren't available** — not on
  football-data.org at any tier (both 403). Logged in `TODO.md` with the options.

### 2026-07-30 — The site survives a database outage

An Atlas connection failure in development exposed that **any** failing data read took
down the whole route: `GET / 500 in 13.0s`, because one widget couldn't reach Mongo. For a
site whose whole pitch is loading fast on a weak connection, that's the wrong failure
mode.

- **Public read helpers now degrade instead of throwing.** All 18 of them wrap their query
  in `publicRead()`, so an unreachable database renders each section's existing
  empty state rather than an error page. Verified by building and serving with the URI
  pointed at an unroutable host: every public route returns 200 in ~4ms, and the build —
  which previously failed outright — prerenders all 29 pages.
- **The CMS deliberately still fails loudly.** An admin shown an empty article list would
  reasonably conclude their content had been deleted, and a Server Action that swallowed a
  connection error would tell an editor their edit saved when it hadn't. Quiet degradation
  is only correct where the alternative is showing a reader an error for something they
  didn't ask about.
- **A failed connection now has a 5-second cooldown.** Without it every request paid the
  full 3-attempt retry budget (~13s), so one outage made every page a 13-second wait and
  pointed a reconnect storm at Atlas from every concurrent request.
- Failure logging is throttled to one line per 10 seconds, so an outage doesn't write a
  line per widget per request across every worker.

Known trade-off, logged in `TODO.md`: during an outage a section says "No tips posted yet
today" rather than "temporarily unavailable". Better than a 500, still not strictly
accurate.

### 2026-07-30 — Match reports generated without an LLM

Replaced the Claude-drafting pipeline built earlier the same day with a pure-JavaScript
one, on the call that the recurring per-article cost wasn't worth it. That's only
possible for some content, and the split is the interesting part:

- **Match reports are now generated in plain JavaScript** from the `football-data.org`
  data the score sync already stores — so zero extra provider requests, zero API cost,
  no hallucination risk, and the same match always produces the same words. Turning
  structured facts we hold into sentences is templating; that's what wire services have
  done for results for years.
- **News and transfer stories became an attributed link list instead.** They can't be
  written this way: a feed gives us someone else's prose, and rearranging their words in
  JavaScript is a derivative of their writing however far it drifts — and reads like
  spam. So "Around the Web" shows the headline, names the publisher, and links out.
- **Half-time scores are now stored.** The feed always returned them and we were
  discarding them. With no scorers on the free tier they're the *only* signal about how
  a match went, so they're what lets a report say a side came from behind, was held to a
  draw after leading, or settled it after the break.
- **Reports state only what the data proves.** No scorers, no "dominant display", no
  predictions. Standalone reports are reserved for results with something to say (a
  comeback, a 3+ goal margin, 5+ goals) because with no scorers a routine 1-0 reads as
  three near-identical sentences; everything else goes in the daily round-up.
- **Football-only is now enforced by the article's own URL**, not by which feed carried
  it. That was the actual cause of the earlier cricket/tennis/darts leak — a feed that
  looked like Sky's football news was its all-sport feed — so checking the story rather
  than the feed is what stops it recurring.
- **Three bugs caught in the generated prose** before it could ship: half-time scores
  printed home-away regardless of who led ("Chelsea led 0-2 at the interval"), a 0-0
  claiming "the scoring was done by half-time", and goalless games saying the same thing
  three times in four sentences.
- Dropped the `@anthropic-ai/sdk` dependency and `ANTHROPIC_API_KEY` entirely. There is
  now no recurring cost anywhere in this project.

### 2026-07-30 — Automatic live scores, and everything pinned to GMT+1

- **Live scores now update themselves.** Integrated football-data.org, chosen over
  API-Football because its free tier is 10 requests/minute across 12 competitions
  rather than 100 requests/day — a live poller would burn a daily cap before
  half-time. Ten competitions in a single request, every 5 minutes via Vercel Cron,
  plus a **Sync now** button for forcing a refresh mid-match.
- **The feed can't overwrite a human.** Editing a synced fixture flags it and the sync
  skips it from then on, because feeds get scores wrong and a correction that silently
  reverts is worse than no automation. Rows are marked `auto`, `edited` or `manual`.
  Hand-added matches (for competitions the free tier misses) are never touched, and
  the sync never deletes, so a provider outage can't empty the ticker.
- **The status line is derived, not typed.** `76'`, `HT`, `FT`, `Postponed` and
  kick-off times all come from the feed's status and minute, so the field that used to
  go stale between manual updates can't any more.
- **All times are GMT+1** — and, the subtle half, the CMS now parses and formats
  `datetime-local` in that zone too. Previously a bare "20:00" was read in the
  server's timezone, so the same entry stored a different instant locally than on
  Vercel and drifted further on every re-save. Verified lossless with the server
  forced to UTC, New York, Tokyo and London.
- **Replaced the newsletter card**, whose Join button did nothing and which promised
  tips "straight to Telegram" — not the plan, since tips live on the site. It now
  shows the real track record: computed win rate, profit and recent results.
- **Fixed a bug the tests surfaced**: `revalidatePath` throws outside a Next request
  context and ran *after* the database write, so a successful sync reported failure
  when called from a script. Cache invalidation is now best-effort.
- Verified the provider mapping against realistic payloads (including unconfirmed
  knockout fixtures with null team names), the upsert rules against the live cluster,
  and that the cron endpoint returns 401 on a wrong secret and refuses to run without
  one at all.

### 2026-07-30 — Fixes from the first real run-through of the CMS

Three bugs found by actually using the admin, plus the moderator permission change.

- **Upload forms were crashing.** The Cloudinary widget needs
  `NEXT_PUBLIC_CLOUDINARY_API_KEY` in the browser, which was never set, so
  `/admin/articles/new` and `/admin/highlights/new` threw on load. Consolidated to
  three variables (cloud name and key are public, only the secret is not) so the
  same mistake can't recur, and the widget now checks for all of them before
  mounting instead of taking the form down.
- **Forms discarded your work on a validation error.** React clears uncontrolled
  inputs once a form action completes, so a single missing field wiped everything
  typed — including a long article body. Submitted values now round-trip through
  the action result and repopulate the form. Passwords are deliberately excluded.
- **Duplicate-key errors blamed the wrong field.** Adding a team at a position
  already taken reported "That competition is already taken", pointing at the wrong
  input. Compound-index clashes now name the field that actually collided.
- **Moderators no longer see the activity log at all** — removed from their
  navigation, the route redirects them out, the dashboard panel is gone, and the
  query is skipped entirely rather than filtered.
- **Transfer news is now visible in the CMS.** It was always there as an article
  category, but with no entry point it looked missing. News and Transfer News are
  separate sidebar sections with counts, the "new" form preselects the right
  category, and saving returns to the tab you came from.
- **Verified every CRUD path against the live Atlas cluster**: create, edit and
  delete for articles, tips, highlights, matches and standings; the hero toggle
  swapping the homepage and gracefully vanishing when nothing is featured; domain
  validation (odds ≥ 1.01, `mm:ss` clip length, numeric scores); and the win rate
  recalculating from 80%/+1.7 to 83%/+2.7 after settling one tip — matching a
  hand-check. All 12 operations landed in the audit log with correct summaries.

### 2026-07-30 — Contact page with a CMS inbox

- **`/contact`** with a working form: name, email, a topic (correction, general
  enquiry, feedback, advertising, press) and the message. Corrections are called out
  as the priority route, since a reader spotting a wrong score is the fastest way for
  us to find out.
- **Messages land in the CMS**, not an email inbox — there's no email service in the
  stack, and a form that silently goes nowhere is worse than no form. `/admin/messages`
  shows unhandled items first, with a mark-handled toggle (recording who did it), a
  reply-by-email link, and an unread badge on the admin nav so it can't be forgotten.
- **This is the only Server Action on the site with no role check**, by design, so it
  carries its own defences: tight length caps, a honeypot field that silently discards
  bot submissions while returning a normal-looking success, and no reflection of stored
  input onto any public page. Rate limiting still needs shared state and is noted as a
  known limitation.
- **The privacy policy was updated to match** — a new data-collection point means the
  policy has to disclose it, so there's now a section on what the contact form stores
  and how long it's kept. Contact links were added to the footer, About and Privacy.
- **Two robustness fixes prompted by a real build failure.** A transient Atlas
  `ECONNRESET` broke a production build mid-prerender, which would have meant a failed
  deploy from a momentary network blip. Connections now retry with backoff on
  network-level errors only (auth and config mistakes still fail fast), and article
  prerendering degrades to on-demand rendering instead of failing the build.
- Shared form primitives moved from `components/admin/` to `components/`, since a
  public page now depends on them.

### 2026-07-30 — Public pages, working navigation, About & Privacy

Phase 2E, which completes the CMS phase. Every link in the site now goes somewhere.

- **New pages:** `/scores` (full match list plus the league table), `/tips` (upcoming
  picks and a permanent, public settled-results table), `/news`, `/transfers`,
  `/highlights` with playable clips, and `/articles/[slug]` for article detail with a
  "read next" block.
- **Navigation actually works.** The header and mobile tab bar became Client
  Components so they can highlight the current section via `usePathname`, and every
  `href="#"` placeholder across the nav, ticker, tips, highlights and standings now
  points at a real destination.
- **A real footer**, grouped into Football / Reading / TopGoals, replacing the four
  placeholder links.
- **About Us** explains what the site covers, how tips are written, and why losing
  tips stay published — including the point that the win rate is computed from the
  database and so can't be quietly rounded up after a bad week.
- **Privacy Policy** written to actually be read, covering what's collected, cookies
  (one, for staff sign-in — which is why there's no consent banner), retention, and
  your rights. It includes a substantial responsible-gambling section with real
  helplines (BeGambleAware, GamCare, GAMSTOP), linked from the footer of every page.
- **Everything stays static.** All the new pages are prerendered with a one-minute
  refresh; article pages are pre-built per slug via `generateStaticParams`; About and
  Privacy are fully static with no revalidation since they rarely change.
- Verified every route in a production build: all pages return 200, an unknown article
  slug 404s, and `/admin` redirects to sign-in.

### 2026-07-29 — The public homepage now reads from the database

Phase 2D. Anything published in the CMS appears on the live site. `mock-data.ts` is
gone.

- **A read layer** (`lib/data/*`) returns plain serialisable objects with string ids,
  never Mongoose documents — hydrated docs and ObjectIds can't cross into a Client
  Component, and keeping the mapping in one place stops database shape leaking into
  UI props.
- **Every homepage section is now a Server Component** reading from MongoDB: hero,
  live ticker, results strip, today's picks, highlights, latest news, standings and
  trending tips.
- **Numbers are derived, not typed.** The 30-day win rate and profit are aggregated
  from settled tips (a winner returns odds − 1, a loser costs 1), so the figure on the
  page always matches the tips actually posted. Goal difference comes from the goals
  columns. Relative timestamps are computed at render, so "2 hours ago" can't go
  stale the way the old hardcoded strings did.
- **The ticker orders by meaning**: live matches first, then upcoming, then finished.
- **Empty states everywhere.** A fresh install with no content renders sensible
  placeholders instead of empty boxes, and the results strip relabels itself to
  "Recent Results" when nothing was settled yesterday rather than showing an empty row
  under a "Yesterday" heading.
- **The homepage stays static** — prerendered HTML is what keeps it quick on a weak
  connection — with a one-minute regeneration window so live scores and timestamps
  don't freeze at build time. CMS edits still push through immediately via
  `revalidatePath`.
- Verified against the real Atlas cluster: the page renders live data end to end, and
  the win rate showed the true 80% / +1.7 units computed from the seeded tips rather
  than the mock's invented figures.

### 2026-07-29 — Content CRUD for every section of the site

Phase 2C. Everything on the homepage can now be created, edited and deleted from
the CMS. The public pages still read the old mock data — Phase 2D swaps that over.

- **Five content types**, each with a list view, create and edit forms, and delete:
  articles (news + transfers), betting tips, goals & highlights, live scores, and the
  league table.
- **The homepage hero is a featured article**, not a separate thing to maintain.
  Ticking "feature this on the homepage hero" reveals the hero-specific fields, and
  saving automatically un-features whatever was there before — with the database
  index as the backstop.
- **Cloudinary uploads** for article images, highlight videos and thumbnails. Uploads
  are signed server-side and go straight from the browser to Cloudinary, so files
  never pass through our server and the upload endpoint can't be abused anonymously.
  Replacing or deleting an asset deletes the old file too, so storage doesn't fill up
  with orphans.
- **Validation that reflects the domain**, not just "required": odds must be decimal
  and above 1.01, clip length is entered as `mm:ss`, scores accept a number or blank
  before kickoff, and a featured article must have the hero copy the homepage needs.
  Highlighted hero words are checked to actually appear in the hero headline.
- **Goal difference is derived** from the goals-for and goals-against columns rather
  than stored, so the table can never contradict itself.
- **Slugs survive edits.** Retitling an article regenerates its slug; editing anything
  else keeps it, so existing links and shares don't break.
- Every change is validated server-side, recorded in the audit trail with before and
  after snapshots, and pushed live via `revalidatePath` without a redeploy.

### 2026-07-29 — CMS foundations: database, authentication, staff accounts, audit trail

Phases 2A and 2B. The site now has a real backend and a working CMS shell; content
CRUD lands next.

- **Database:** MongoDB via Mongoose with a hot-reload-safe cached connection, and
  models for articles, tips, highlights, matches, standings, users and audit entries.
  A partial unique index enforces "only one featured article" at the database level,
  so a racing double-submit can't produce two homepage heroes.
- **Authentication:** Auth.js v5 with email/password (bcrypt) and JWT sessions. The
  config is deliberately split — `auth.config.ts` stays free of Mongoose and bcrypt so
  the edge proxy can authorize `/admin` from the JWT alone with no database round-trip.
- **Roles:** administrator, moderator, and an inert `user` role scaffolded for future
  public accounts. Route protection plus per-action `requireRole()` checks, since
  Server Actions are directly POST-able and the proxy alone is not a security boundary.
- **Staff accounts:** full CRUD for administrators, with guards against demoting
  yourself, deleting your own account, or removing the last remaining admin.
- **Audit trail:** every mutation records actor, action, entity and full before/after
  document snapshots — so deletes stay meaningful after the record is gone, and a
  future diff view comes for free. Password hashes are stripped from snapshots.
  Administrators see the whole log; moderators see only their own actions.
- **Seeding:** `npm run seed` migrates the previous mock content into real documents
  (with generated slugs and real article bodies) and creates the first admin from env
  vars. Idempotent by default, with `--reset` to wipe and re-seed content only.
- **Verified end to end** against a real MongoDB: seeding and idempotency, the
  featured-article constraint, accented slug generation (`Mbappé` → `mbappe`), correct
  rejection of bad passwords, staff-only sign-in, moderators blocked from admin-only
  areas, audit snapshots containing no password hashes, and `revalidatePath` refreshing
  lists immediately after a change.

### 2026-07-29 — Initial build: homepage design + Next.js port

- Designed the full dark "stadium-under-lights" brand identity from scratch (palette, type pairing, signature live-ticker element)
- Built and iterated a static HTML/CSS homepage mockup, including a from-scratch desktop layout (sticky sidebar, hover states) distinct from the mobile layout, and a hero section with an original CSS/SVG-illustrated athlete silhouette
- Scaffolded the real Next.js 16 + TypeScript + Tailwind v4 project
- Ported the full homepage to production React components: header/nav, hero, live scoreboard ticker, yesterday's-results trust strip, today's picks, goals & highlights, latest news, standings/trending-tips/newsletter sidebar, footer, mobile tab bar
- Verified visual parity with the mockup at mobile/tablet/desktop widths; confirmed clean lint and a successful static production build
