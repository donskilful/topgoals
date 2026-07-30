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

## 2. Wire up the newsletter signup

**Priority: high** · Effort: ~2 hours

### The problem

The "Get Tips First" card in the homepage sidebar
(`src/components/sidebar/newsletter-card.tsx`) has an email input and a **Join
button that does nothing.** The form has no `action`, so submitting it reloads the
page and silently discards the address. It also claims "Join 40,000+ punters",
which is invented placeholder copy and should not ship as-is.

This is the most visible broken promise on the site — worth fixing or removing
before launch.

### What done looks like

Submitting a valid email stores it and shows a confirmation. The subscriber list is
viewable in the CMS. The "40,000+" claim is replaced with something true.

### Suggested approach

Follow the pattern the contact form already established — it's the closest analogue
and was built to be copied:

1. `src/lib/models/subscriber.ts` — `{ email (unique, lowercase), source, createdAt,
   unsubscribedAt }`. Keep unsubscribes as a timestamp rather than deleting, so a
   re-subscribe doesn't look like a new signup.
2. `src/lib/schemas/newsletter.ts` — email plus a honeypot, mirroring
   `src/lib/schemas/contact.ts`.
3. `src/lib/actions/newsletter.ts` — a public action (no `requireRole`, like
   `submitContactMessage`). Treat a duplicate email as success, not an error: telling
   a stranger "that address is already subscribed" leaks who is on the list.
4. Convert `newsletter-card.tsx` to a Client Component using `useActionState`, and
   swap the invented count for real copy.
5. `/admin/subscribers` list page with a CSV export, so the list can be moved into a
   real mail tool later.

### Decide before building

Where do tips actually get sent from? If it's Telegram (the copy currently says
"straight to Telegram"), collecting emails is the wrong field entirely and this
should capture a Telegram handle, or link to the channel instead. **Resolve the copy
question before writing the model.**

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

## 4. Automate live scores

**Priority: medium** · Effort: 2–3 days

### The problem

Scores are typed by hand. `Match.meta` is free text (`"76'"`, `"FT"`, `"Today
20:00"`) that a human keeps current during a match. That's unsustainable beyond a
handful of fixtures, and the `/scores` page admits the delay to visitors.

### Suggested approach

1. Pick a data provider. [API-Football](https://www.api-football.com) (via
   RapidAPI) is the usual starting point — free tier around 100 requests/day, which
   is enough for a few leagues if polling is coarse. Check the terms: some providers
   forbid redistributing odds or storing data long-term.
2. Add `externalId` to the `Match` model so fetched fixtures can be matched to
   existing rows instead of duplicated.
3. A cron route (`src/app/api/cron/scores/route.ts`) protected by a shared secret
   header, wired to Vercel Cron. Poll more often during match windows than overnight.
4. Derive `status` and `meta` from the feed rather than storing what a human typed,
   but **keep manual override possible** — feeds get things wrong, and a wrong score
   on a betting site is worse than a late one.
5. Call `revalidatePath("/")` and `revalidatePath("/scores")` after each update, the
   same way the CMS actions do (see `src/lib/actions/revalidate.ts`).

### Watch out for

- The homepage has a 60-second revalidate window, so polling faster than that
  achieves nothing visible. Match the two.
- Free tiers rate-limit hard. Cache aggressively and back off on 429s.
- Once this lands, remove the "scores are updated manually" note from
  `src/app/scores/page.tsx` and the corresponding line in the README's known
  limitations.

---

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
