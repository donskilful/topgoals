# TopGoals ⚽

A fast, mobile-first football (soccer) hub — live scores, daily betting tips with
tracked results, transfer news, sports news, and goals & highlights, all built to
feel instant even on a poor connection.

> **Status:** Early build. Homepage UI is complete on mock data. No backend yet.

## Why this stack

Built on a modern, fast-by-default flavor of MERN: Next.js instead of a plain
CRA/Express-rendered React app, so the same team knowledge (React, Node, MongoDB
later) is kept, but with server rendering, automatic code-splitting, and built-in
image optimization out of the box — the things that matter most for a sports/betting
audience on mobile, often on weak connections.

| Concern                            | Why it's handled here                                                    |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Fast first paint on slow networks   | Server-rendered HTML; the homepage builds as fully static (SSG) content   |
| Mobile-first, native-app feel       | Fixed bottom tab bar on mobile, fully responsive down to 375px            |
| No wasted bytes                     | Hero illustration is pure CSS/SVG — zero image assets to download         |
| Fonts                               | Self-hosted via `next/font` (Anton, Inter, JetBrains Mono) — no external font requests |

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` config, no `tailwind.config.js` needed)
- **Fonts:** Anton (display), Inter (body), JetBrains Mono (scores/odds/data)
- **Data (current):** typed mock data in `src/lib/mock-data.ts` — swappable for a real API/DB later
- **Planned:** MongoDB + Mongoose, Redis caching, Socket.IO/SSE for live scores, PWA layer

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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run lint    # ESLint
```

## Project structure

```
src/
  app/
    layout.tsx        # fonts, metadata, root layout
    page.tsx           # homepage assembly
    globals.css         # design tokens + Tailwind @theme
  components/
    site-header.tsx
    hero.tsx / hero-figure.tsx / hero-ghost.tsx
    live-ticker.tsx
    trust-strip.tsx
    todays-picks.tsx
    goals-highlights.tsx
    latest-news.tsx
    site-footer.tsx
    mobile-tabbar.tsx
    sidebar/
      standings-widget.tsx
      trending-tips.tsx
      newsletter-card.tsx
  lib/
    mock-data.ts        # all homepage content — swap for real data source here
design/
  homepage-mockup.html   # original static design reference
```

## Roadmap

- [x] **Phase 0** — Brand & UI direction (dark stadium-under-lights identity)
- [x] **Phase 1** — Next.js scaffold, homepage ported to real components on mock data
- [ ] **Phase 2** — Backend & DB: MongoDB schemas (Matches, Tips, Articles, Teams), admin CRUD for daily tips/news
- [ ] **Phase 3** — Live data: real-time score updates, caching layer
- [ ] **Phase 4** — Automation: third-party sports data API integration, scheduled jobs
- [ ] **Phase 5** — PWA, auth, push notifications, growth features

Also planned: Scores page, Tips archive page, Match/Article detail pages, league
standings pages — using the same design system established here.

## Progress log

Every push gets an entry here — what shipped and why, newest first.

### 2026-07-29 — Initial build: homepage design + Next.js port

- Designed the full dark "stadium-under-lights" brand identity from scratch (palette, type pairing, signature live-ticker element)
- Built and iterated a static HTML/CSS homepage mockup, including a from-scratch desktop layout (sticky sidebar, hover states) distinct from the mobile layout, and a hero section with an original CSS/SVG-illustrated athlete silhouette
- Scaffolded the real Next.js 16 + TypeScript + Tailwind v4 project
- Ported the full homepage to production React components: header/nav, hero, live scoreboard ticker, yesterday's-results trust strip, today's picks, goals & highlights, latest news, standings/trending-tips/newsletter sidebar, footer, mobile tab bar
- Verified visual parity with the mockup at mobile/tablet/desktop widths; confirmed clean lint and a successful static production build
