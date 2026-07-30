# TopGoals ⚽

A fast, mobile-first football (soccer) hub — live scores, daily betting tips with
tracked results, transfer news, sports news, and goals & highlights, all built to
feel instant even on a poor connection.

> **Status:** The CMS is complete, the public site runs on real data, and live
> scores update automatically. Next up: automating news and transfer ingestion.

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
- **Live scores:** football-data.org, polled by Vercel Cron
- **Automated news:** Sky Sports + Guardian Football RSS, drafted by Claude
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
6. **`CRON_SECRET`** — any long random string (`openssl rand -base64 32`). Guards the
   score-sync endpoint so nobody else can trigger it.

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

## Automated news

News and transfer articles can be written automatically from what the public football
feeds are reporting — **Sky Sports** (football news + Transfer Centre) and **Guardian
Football**. Vercel Cron hits `/api/cron/news` every two hours.

**How it works, and why it works this way.** The pipeline reads the feeds to learn *what
happened*, then Claude writes TopGoals' own article from those facts. It never rewords
anyone's sentences. That distinction is the whole design:

> Facts about the world aren't copyrightable. The words a journalist chose to report
> them are.

So paraphrasing a Sky Sports article — however heavily — still produces a derivative of
Sky's work. Reporting the same event in our own words does not. The drafting prompt in
`src/lib/ai/draft-article.ts` enforces this, along with a hard rule against adding any
detail the sources didn't state: no invented quotes, scores, fees or injuries. On a site
with betting tips beside the news, a fabricated detail can cost a reader money, so the
drafter is told to skip a story rather than pad it.

Crawling the sites themselves was considered and rejected: Sky's `robots.txt` disallows
bots, article prose and highlight video are licensed content, and republishing either
would be infringement regardless of attribution.

**Images.** Automated articles carry no photograph. Instead `ArticleArtwork` generates an
original card from the site's own visual language — floodlit pitch geometry, seeded from
the article slug so every story looks different and always looks the same. Reusing a
publisher's photo would be infringement, and adding a watermark over one makes it worse,
not lawful: sports photography is the most actively enforced category there is.

**What the pipeline filters out**, because none of it can become an honest article:

- Live blogs and rolling round-ups (`Transfer Centre LIVE!`, `Arsenal latest:`) — a
  continuously edited page covering many unrelated things
- Paper reviews, gossip and rumour columns — round-ups of other outlets' unconfirmed
  claims, which is the most misleading thing this pipeline could publish
- Opinion columns, identified by the Guardian's `… | Columnist Name` byline
- Quizzes, polls, podcasts and video-only items
- Anything with a summary too short to write from, or an unreadable date

**Two things worth knowing before switching it on:**

1. **Articles publish immediately — there is no review queue.** That was a deliberate
   product decision. The guardrails are a cap of 4 articles per run, an `auto` badge and
   source links on every article in the CMS, reader-facing disclosure on the article
   page, and an audit-log entry attributed to a `TopGoals Automation` account that
   cannot be signed into.
2. **`NEWS_AUTOMATION` must equal `"on"`.** It defaults to off, so deploying the code
   doesn't start publishing. This is the kill switch — flip it without a redeploy.

Preview what a run would do, without writing anything:

```bash
npm run news:dry-run            # feeds + clustering only, no API spend
npm run news:dry-run -- --draft # also draft the top story and print it
```

Stories reported by both publishers are merged so the drafter works from two independent
accounts of the same event. In practice most stories are still single-source — the two
feeds publish at very different volumes — so corroboration is a bonus, not something the
pipeline depends on.

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
    feeds/rss.ts                      # reads Sky/Guardian RSS; filters non-stories
    feeds/cluster.ts                   # groups reports of the same event
    ai/draft-article.ts                 # writes original prose from the facts
    sync/matches.ts                      # score feed -> database upsert rules
    sync/news.ts                          # news pipeline: feeds -> drafted articles
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

### Two rules worth knowing before adding code

1. **`lib/constants.ts` must never import Mongoose.** Client Components, Zod schemas
   and the edge proxy all import from it. Put shared enums there, not in a model file
   — importing a model from client code drags the whole ODM into the browser bundle
   and breaks the build.
2. **Every mutating Server Action must call `requireRole()` itself.** The proxy is a
   UX redirect, not the security boundary: Server Actions are directly POST-able once
   their action ID reaches the client bundle.

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

### 2026-07-30 — News and transfer articles write themselves

- **Automated news from Sky Sports and Guardian Football.** Reads their public RSS
  feeds for the *facts* of a story, then has Claude write TopGoals' own article from
  those facts. Runs every two hours via Vercel Cron.
- **Not a scraper, and not a paraphraser.** Crawling Sky was the original idea and was
  rejected: its `robots.txt` disallows bots, and its prose and highlight video are
  licensed content. Rewording someone's article is no better — it's still a derivative
  work. What's actually safe is the distinction the whole pipeline is built on: facts
  aren't copyrightable, the words chosen to report them are. So the drafter reports the
  event and never reuses a source's phrasing.
- **Nothing gets invented.** The prompt forbids adding any detail the sources didn't
  state — no quotes, scores, fees or injuries — and tells the model to skip a story
  rather than pad it. Betting tips sit next to this content; a fabricated detail can
  cost a reader money.
- **Original artwork instead of borrowed photos.** Automated articles have no
  photograph, so `ArticleArtwork` generates a card from the site's own visual language,
  seeded from the slug. Reusing a publisher's photo would be infringement, and
  watermarking one makes it worse rather than lawful — sports photography is the most
  actively enforced category there is. Every article without an uploaded image now gets
  this, so the CMS benefits too.
- **Publishes immediately, by choice.** No review queue. The guardrails are a 4-article
  cap per run, a `NEWS_AUTOMATION` kill switch that defaults to off, an `auto` badge and
  source links in the CMS, reader-facing disclosure on the article page, and audit
  entries under a `TopGoals Automation` account that cannot be signed into.
- **Junk is filtered before drafting.** Live blogs, rolling round-ups, paper reviews,
  gossip and rumour columns, opinion pieces, quizzes and polls — none of which can
  become an honest news article. Rumour round-ups matter most here: publishing
  unconfirmed claims as reported fact is the worst thing this pipeline could do.
- **Four real bugs found by running it against the live feeds**, all of which would
  have shipped silently:
  - Sky stamps its feed in `BST`, which `new Date()` can't parse. Every Sky item was
    being dated "now", so the recency window did nothing and a six-day-old transfer
    round-up would have published as breaking news.
  - The feed I'd picked (`12040`) is Sky's *all-sport* news feed — only 8 of 20 items
    were football, so cricket, tennis and darts were reaching a football site.
    `11095` is the football one.
  - Sky files the same article to both its news and transfer feeds under different
    guids, which published each story twice. Story identity now keys on Sky's article
    id with the feed id stripped.
  - Cross-source clustering never fired, because headline word-overlap scores two
    genuine reports of the same match at 0.13. It matches on shared proper nouns now,
    which is what real headlines actually have in common.
- **`npm run news:dry-run`** shows exactly what the next run would publish without
  writing anything — worth using before switching automation on, given nothing is
  reviewed.

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
