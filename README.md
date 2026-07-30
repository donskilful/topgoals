# TopGoals ⚽

A fast, mobile-first football (soccer) hub — live scores, daily betting tips with
tracked results, transfer news, sports news, and goals & highlights, all built to
feel instant even on a poor connection.

> **Status:** The CMS is complete and the whole public site runs on real data.
> Next up: automating live scores and news ingestion.

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
- **Planned:** Redis caching, Socket.IO/SSE for live scores, PWA layer

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
    models/                         # Mongoose schemas
    schemas/                         # Zod validation
    actions/                          # 'use server' mutations
    data/                    # read helpers for the public site (plain objects, no Mongoose docs)
    format.ts                 # relative time, clip length, kick-off formatting
scripts/
  seed.ts                   # starter content + bootstrap admin account
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

- **Live scores are manual.** There is no score feed yet, so the ticker's status line
  (`76'`, `FT`, `Today 20:00`) is typed by hand in the CMS. Phase 4 automates this.
- **No email.** Account creation hands over a temporary password out of band; there is
  no invite email or password-reset flow. Contact form messages land in the CMS inbox
  rather than an email inbox, so someone needs to check `/admin/messages`.
- **The contact form isn't rate-limited.** It's validated and honeypotted, but proper
  rate limiting needs shared state (Redis) that isn't in the stack yet. Submissions only
  ever appear in the private CMS, never on a public page.

## Progress log

Every push gets an entry here — what shipped and why, newest first.

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
