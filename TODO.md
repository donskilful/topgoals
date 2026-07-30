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

## 2. Automate news and transfer ingestion

**Priority: high** · Effort: 3–5 days · The biggest remaining piece of work

### The problem

Articles are written by hand in the CMS. The plan is for news and transfer stories to
arrive automatically, the way scores now do.

This is materially harder than the score sync, and worth being clear-eyed about why:
scores are *structured facts* with one correct answer, while news is prose. Republishing
someone else's article wholesale is copyright infringement, and Google penalises
scraped duplicate content — so the naive version of this is both a legal and an SEO
problem.

### Three viable approaches, in increasing order of effort

**a) Headline aggregation with attribution.** Pull RSS/Atom feeds from reputable
sources, store headline, source name, link and timestamp, and render them as a "from
around the web" list that links out. Legally clean, cheap, and quick — but the reader
leaves your site, so it doesn't build the archive.

**b) LLM-assisted rewriting with a human gate.** Ingest feeds, have a model draft an
original summary, and hold it as a **draft** for a moderator to approve. This is the
approach that fits the existing CMS: it reuses the Article model, it keeps a human
accountable for what publishes, and the audit log already records who approved what.
Needs a `status: draft | published` field on Article and a review queue.

**c) Fully automatic publishing.** Only sane once (b) has run long enough to trust the
draft quality. Even then, keep a kill switch.

**Recommendation: build (a) first** — it's a day's work and immediately useful — then
(b) behind a moderation queue. Skip (c) until the drafts are demonstrably good.

### If you go with (b), decisions to make first

- **Which sources?** Check each one's terms; some feeds explicitly forbid derivative
  use. BBC Sport, Sky Sports and the major agencies all differ.
- **Which model?** Any of the current Claude models handles summarisation well. Cost is
  per-article and small, but it's a real running cost unlike everything else here.
- **How is provenance shown?** Readers should be able to see where a story came from.
  That's both honest and a defence if a source complains.
- **What stops duplicates?** The same transfer gets reported by ten outlets. Cluster on
  entities/similarity before drafting, or you'll publish the same story ten times.

### Files this will touch

- `src/lib/models/article.ts` — add `status`, `sourceName`, `sourceUrl`, `externalId`
- A new `src/lib/sync/news.ts`, mirroring `src/lib/sync/matches.ts`
- `src/app/api/cron/news/route.ts` plus a second entry in `vercel.json`
- The admin articles list needs a Drafts tab and an approve action
- Public article queries need `status: "published"` added — **easy to forget, and
  forgetting it publishes every unreviewed draft**

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
- **Only 10 competitions.** Nigerian NPFL and most non-European leagues aren't on the
  free tier. They can still be added by hand, and the sync leaves them alone.
- **No goal-scorer or lineup data** on the free tier.

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

## 7. Smaller known gaps

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
- [ ] Restrict Atlas Network Access to Vercel's ranges rather than `0.0.0.0/0`
- [ ] Review `/privacy` and `/about` for legal accuracy in your jurisdiction —
      they are written in good faith but have not been reviewed by a lawyer, and
      gambling-adjacent sites attract more scrutiny than most
- [ ] Confirm the 18+ notice and responsible-gambling links meet the requirements
      of any affiliate programme you join
