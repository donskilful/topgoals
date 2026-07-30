# TopGoals — Backlog

Known gaps and planned work. Each item is written to be picked up cold: what's
wrong today, what "done" looks like, which files are involved, and the decisions
already made so nobody has to re-litigate them.

Read [README.md](README.md) first for the architecture, and note the two standing
rules there: `lib/constants.ts` must never import Mongoose, and every mutating
Server Action must call `requireRole()` itself.

---

## 1. Email notifications for contact form submissions

**Priority: high** · Effort: ~half a day

### The problem

Messages sent through `/contact` are saved to MongoDB and shown at
`/admin/messages`. **Nothing is emailed to anyone.** If nobody opens the CMS, a
reader reporting a wrong score gets silence. The unread badge on the admin nav is
the only prompt, and it only works if someone is already logged in.

### What done looks like

A submission still saves to the database, and *additionally* sends an email to the
site owner. The database write stays the source of truth — if the email provider is
down, the message must still be stored and the reader must still see success.

### Suggested approach

[Resend](https://resend.com) is the natural fit: generous free tier (3,000
emails/month, 100/day), a two-line SDK, and no server to run. SendGrid or AWS SES
are fine alternatives if there's an existing account.

1. Sign up, verify a sending domain (or use their test domain while developing),
   create an API key.
2. `npm install resend`
3. Add to `.env.local` and `.env.example`:
   ```
   RESEND_API_KEY=""
   CONTACT_NOTIFICATION_TO=""     # where reader messages get sent
   CONTACT_NOTIFICATION_FROM=""   # must be on a domain verified with Resend
   ```
4. New `src/lib/email.ts` — a thin wrapper that no-ops with a `console.warn` when
   `RESEND_API_KEY` is unset, so local development and CI don't need credentials.
   Mirror the shape of `src/lib/cloudinary.ts`, which already does exactly this.
5. In `submitContactMessage` (`src/lib/actions/contact.ts`), after `Message.create`,
   send the notification inside its own `try/catch`. **It must never throw** — the
   message is already saved and the reader has already been told it worked. Log
   failures server-side, exactly as `destroyAsset` does in `lib/cloudinary.ts`.
6. Include the topic in the subject line (`[Correction] …`) so corrections can be
   filtered, and put the reader's address in `reply_to` so hitting reply works.

### Watch out for

- **Don't** put the reader's address in `from` — it will fail SPF/DKIM and land in
  spam. Send from your own verified domain and use `reply_to`.
- Don't block the response on the email. If it's slow, the reader waits for nothing.
- The privacy policy already discloses that contact details are stored. If email
  notifications introduce a new processor (Resend), the "How your data is used"
  section in `src/app/privacy/page.tsx` should mention it.

### Also worth doing at the same time

An acknowledgement email to the reader ("we got your message"). Low effort once the
wrapper exists, and it closes the loop for the person who wrote in.

---

## 2. Automate news and transfer ingestion — ✅ done (30 Jul 2026)

Done, but **not** the way this entry originally proposed, and the difference matters if
you pick this up.

An LLM-drafting pipeline was built first, then removed in favour of plain JavaScript to
avoid a recurring per-article cost. That works for match reports and cannot work for
news, because:

- **Match reports** are generated from structured facts we already hold (scoreline,
  half-time score, competition, matchday). Facts aren't copyrightable and the sentences
  are ours, so the output is original, free and deterministic.
- **News/transfer stories** only exist as another publisher's prose. Rearranging their
  words in JavaScript is a derivative work however far it drifts, and reads badly. So
  those became an attributed link list ("Around the Web") that sends readers to the
  source — option (a) from the original plan.

See the README's *Automated content* section for the full shape.

### Follow-ups worth doing

- **A paid football-data.org tier would transform the reports.** This is the single
  highest-value improvement. The free tier returns no scorers, bookings or referees, so
  reports can't name who scored and are necessarily brief. With goal events, the same
  template engine could write genuinely good reports — still with no LLM cost.
- **A review queue.** Nothing is read before it reaches readers. Reports are low-risk
  (they only restate scores the feed gave us) but the cheapest safeguard is a
  `status: draft | published` field plus a Drafts tab. If you add it, public queries must
  filter `status: "published"` — forgetting that publishes every unreviewed draft.
- **Read the first week's output.** The `auto` badge in the CMS article list makes them
  easy to find. `NEWS_AUTOMATION=off` stops everything instantly.
- **Report variety will show with volume.** Phrasing is picked by a hash of the fixture,
  so a given match always reads the same but different matches vary. Across a full
  season the same few sentence shapes will recur; more alternatives in
  `src/lib/reports/match-report.ts` is a cheap fix when it starts to show.
- **League-table context.** We already store standings. "The win moves them up to
  fourth" would add real value to reports, and is pure JS. Left out for now because
  standings and match data can disagree mid-round, and a wrong position is worse than no
  position.
- **Highlights are still manual, deliberately.** Highlight video is licensed content;
  embedding or re-hosting a publisher's clips is a rights problem no attribution fixes.
  The legitimate routes are official club/league embeds where their terms allow it, or a
  licensing deal.
- **Clustering is only used for the headline list now.** It matches shared proper nouns
  in headlines with a 12-hour window and a minimum-3-names rule (the comments in
  `src/lib/feeds/cluster.ts` explain each guard). Lower stakes than when it fed drafting,
  since a mis-grouped headline is just a duplicate link.

---

## 3. Rate-limit the public form(s)

**Priority: medium** · Effort: ~2 hours

### The problem

`submitContactMessage` is the only Server Action with no authentication — by
necessity. It's validated and honeypotted, which stops naive bots, but there's
nothing stopping a determined script from inserting thousands of rows. Same will
apply to the newsletter action once it exists.

Proper rate limiting needs state shared across serverless invocations, which the
stack doesn't have yet.

### Suggested approach

[Upstash Redis](https://upstash.com) with `@upstash/ratelimit` — serverless-friendly,
free tier is ample, and it's the standard pairing with Vercel. A sliding window of
roughly 3 submissions per IP per 10 minutes is generous for humans and useless for
spammers.

Get the client IP from the `x-forwarded-for` header via `next/headers`. Note this is
**not** trustworthy in general, but behind Vercel's proxy it's set correctly — don't
copy the pattern to a self-hosted deployment without checking.

Fail *open*, not closed: if Redis is unreachable, allow the submission. A broken
cache should not stop a reader reporting a wrong score.

### Cheaper interim option

A unique index on `{ email, createdAt }` bucketed per hour, or simply rejecting an
identical `(email, body)` pair submitted twice within an hour. Stops accidental
double-submits and lazy spam with no new infrastructure.

---

## 4. Automate live scores — ✅ done (30 Jul 2026)

Implemented with football-data.org. See the "Live scores" section of the README for
how it works, and `src/lib/football-data.ts` / `src/lib/sync/matches.ts`.

Remaining follow-ups if you want to go further:

- **Standings aren't synced yet**, only matches. The provider exposes
  `/competitions/{code}/standings`, but that's one request per competition — ten
  requests against a 10/minute budget. Sync it on a slower schedule (hourly is plenty;
  tables don't change mid-match) rather than alongside scores.
- **Coverage is 13 competitions, not everything.** Confirmed by querying
  `/competitions` with the live key. Notably **Europa League and Conference League
  return 403** — they're paid-only. So the qualifiers a site like LiveScore shows
  simply aren't available on this plan. Two ways to close that gap:
  - **Upgrade football-data.org.** Cheapest path, same code — the competition codes
    just start returning data. Add them to `TRACKED_COMPETITIONS`.
  - **Add API-Football as a second provider.** Its free tier lists 1,200+ leagues
    (including Europa League qualifying, the Nigerian NPFL and most African leagues)
    but caps at ~100 requests/day, so it can only be polled every ~15 minutes. The
    sensible shape is football-data.org for the majors at 5-minute freshness plus
    API-Football for breadth on a slower schedule, both writing through
    `syncMatches`. `externalId` would need a provider prefix to avoid collisions.
- **Requests are capped at a 10-day span.** Anything wider 400s with "Specified
  period must not exceed 10 days"; `fetchMatches` clamps and warns.
- **No goal-scorer or lineup data** on the free tier.
- **Standings still aren't synced** — see above.

## 5. Password reset for staff

**Priority: medium** · Effort: ~half a day (needs #1 first)

### The problem

There is no way to reset a forgotten password. An administrator must edit the
account and hand over a new one directly. If the *only* administrator forgets
theirs, the sole recovery path is running a script against the database.

### Suggested approach

Depends on email (#1) existing first.

Standard single-use token flow: a `PasswordResetToken` collection storing a *hash*
of the token (never the token itself), a 1-hour expiry, and single-use enforcement.
The request endpoint must respond identically whether or not the address exists,
otherwise it becomes an account-enumeration oracle — the same reasoning behind the
deliberately generic "Incorrect email or password" on the login form.

Rate-limit it (#3) — reset endpoints are a favourite spam vector.

---

## 6. Search

**Priority: low** · Effort: ~1 day

### The problem

The magnifying-glass button in the header (`src/components/site-header.tsx`) is
decorative. It has an `aria-label` but no handler.

Either implement it or remove it — a button that does nothing is worse than no
button, particularly for anyone using a screen reader.

### Suggested approach

MongoDB Atlas free tier includes Atlas Search. A single index over `Article.title`,
`excerpt` and `body` plus `Tip.fixture` covers realistic queries. Add `/search?q=`
as a normal server-rendered page — no client-side search library needed at this
content volume.

If that's more than is wanted right now, **delete the button** and reopen this later.

---

## 7. Empty states don't distinguish "none" from "unavailable"

**Priority: low** · Effort: ~1 hour

### The problem

Public read helpers now degrade instead of throwing when Mongo is unreachable (see
`src/lib/data/public-read.ts`), so a database outage renders the page with empty
sections rather than a 500. That's the right trade — but the empty states say things
like *"No tips posted yet today"*, which during an outage is inaccurate: there may well
be tips, we just couldn't fetch them.

Low priority because the alternative (an error page) is worse for the reader, and the
server log records the real cause. But on a tips site, telling someone there are no tips
when there are is worth fixing eventually.

### Suggested approach

Have `publicRead` return a discriminated result (`{ ok: true, data }` / `{ ok: false }`)
rather than a bare fallback, and let sections render "Temporarily unavailable — try again
shortly" on `ok: false` while keeping the existing copy for a genuine empty set. The
wrapper already knows the difference; it just throws that information away.

---

## 8. MLS and Saudi Pro League tables

**Priority: medium** · Effort: ~half a day

### The problem

Both were asked for and **neither is available on football-data.org at any tier**.
`/competitions` returns exactly 13 competitions for our key, and `MLS`, `SPL` and `ASL`
all return HTTP 403. The standings sync therefore covers the Premier League, La Liga,
Serie A, Bundesliga, Ligue 1 and Brasileirão only.

### Options, in order of preference

1. **A second provider for those two leagues.** API-Football (api-sports.io) covers both.
   Its free tier is 100 requests/day, which does *not* support a 15-minute cadence for two
   leagues (192/day) but comfortably supports hourly (48/day). Standings barely change
   between matches, so hourly is honestly enough.
2. **Manual CMS entry.** Already works — add the rows under a competition name and they'll
   show in the switcher alongside the synced ones. `autoSynced` stays false, so the sync
   never touches them and the "prefer a live table" ordering won't promote them. Fine for
   a league you update weekly; tedious otherwise.
3. **A paid football-data.org plan** — worth checking their current coverage first, since
   their catalogue is mostly European plus Brazil and MLS may not appear at any price.

### If you add a provider

Keep it behind the same shape as `src/lib/football-data.ts`: a `fetchStandings`-style
function returning `FeedStandings`, so `syncStandings` doesn't need to know which provider
a competition came from. The `isPublishableTable()` guard should apply to any provider —
the pre-season inconsistencies it catches are unlikely to be unique to this one.

---

## 9. Richer match reports need a paid tier

**Priority: medium** · Effort: ~half a day once the tier is available

The free tier returns **no scorers, bookings or referees**, so generated reports can't name
who scored and are necessarily brief. The template engine in
`src/lib/reports/match-report.ts` is built to take more: with goal events it could write
genuinely good reports, still with no LLM cost. This is the single highest-value upgrade to
the automated content.

Also unavailable on the free tier: `form` (the recent-results string). The `form` field
exists on `StandingRow` and is always empty today — it's populated by the mapper but the
provider returns nothing, and no UI reads it yet.

### Also worth doing

- **League-table context in reports** ("the win lifts them to fourth"). Pure JS, we already
  store standings. Left out because standings and match data can disagree mid-round, and a
  wrong position is worse than none.
- **Last season's final table as archive content.** The sync deliberately discards it, but
  it's real data — a "2025/26 final table" view would be honest and useful, and needs only
  a season label on the model plus a heading.

---

## 10. Smaller known gaps

| Gap | Where | Notes |
| --- | --- | --- |
| No pagination on public lists | `/news`, `/transfers`, `/highlights`, `/tips` | Capped at 24–60 items. Fine for now; will silently hide content as the archive grows. |
| Single league in the table | `StandingRow.competition` | The field and index support multiple competitions, but nothing surfaces a second one. `DEFAULT_COMPETITION` in `lib/constants.ts` is the current assumption. |
| Timezones | `lib/format.ts` | All times render in the server's zone with `en-GB` formatting. A reader in Lagos sees UK kick-off times. Consider storing a display timezone, or rendering client-side. |
| Newsletter / Telegram delivery | Removed for now | The card promised Telegram delivery behind a dead button; tips live on the site instead. If delivery is wanted later, decide email vs Telegram *first* — it changes what the signup collects. |
| No image on most articles | Cloudinary is wired but seeded content has none | Article cards fall back to a gradient block. Upload real images via the CMS. |
| `user` role is inert | `lib/constants.ts` | Scaffolded for future public accounts (favourites, notifications). Nothing reads it; it cannot access the CMS. |
| No tests | — | Verification has been manual so far. Vitest plus a couple of integration tests around the Zod schemas and the tip-stats aggregation would protect the highest-risk logic. |
| No sitemap or robots.txt | `src/app/` | Worth adding before launch for a content site. Next supports `sitemap.ts` and `robots.ts` conventions natively. |
| Cloudinary images bypass `next/image` | `article-grid.tsx`, `hero.tsx`, others | Plain `<img>` with lazy loading, because each Cloudinary hostname would need allow-listing. Revisit if image weight becomes a problem — Cloudinary's own `f_auto,q_auto` transforms already do most of the work. |

---

## Deployment checklist

Not yet deployed. Before going live:

- [ ] Rotate every credential that has been shared during development (Atlas
      password, Cloudinary API secret) and generate a fresh `AUTH_SECRET`
- [ ] Change the bootstrap admin password from its seeded value
- [ ] Delete the `moderator@topgoals.test` demo account
- [ ] Set all environment variables in the Vercel project (they are **not** read
      from `.env.local` in production)
- [ ] Atlas Network Access will need `0.0.0.0/0`. Vercel gives no fixed egress IPs on
      Hobby or Pro, so there is nothing to whitelist — static IPs are Enterprise-only.
      That makes the database password the *only* protection, so the credential rotation
      above matters more than the IP rule ever did, and the DB user should be scoped to
      `readWrite` on `topgoals` alone
- [ ] Review `/privacy` and `/about` for legal accuracy in your jurisdiction —
      they are written in good faith but have not been reviewed by a lawyer, and
      gambling-adjacent sites attract more scrutiny than most
- [ ] Confirm the 18+ notice and responsible-gambling links meet the requirements
      of any affiliate programme you join
- [ ] Decide whether content automation should be on at launch. It defaults to off
      (`NEWS_AUTOMATION`), and since nothing is reviewed before publication it is
      worth running `npm run news:dry-run -- --samples` and reading the generated
      prose before switching it on
