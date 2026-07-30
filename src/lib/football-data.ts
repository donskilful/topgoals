import { NO_SCORE, SITE_TIMEZONE, type MatchStatus } from "@/lib/constants";

/**
 * Client for football-data.org (v4).
 *
 * Chosen over API-Football because its free tier is a permanent 10 requests/minute
 * across 12 competitions — including Europe's top five leagues and the Champions
 * League — rather than a 100-requests/day cap, which a live-score poller would
 * exhaust within a couple of hours of a matchday.
 *
 * Docs: https://docs.football-data.org/general/v4/match.html
 */

const BASE_URL = "https://api.football-data.org/v4";

/**
 * Competitions we pull. All are on the free tier — adding a paid-only code makes the
 * whole request fail rather than just omitting that competition.
 */
/**
 * Every competition this key can access — confirmed by querying /competitions, since
 * requesting one that isn't on the plan makes the whole request 403 rather than just
 * omitting it.
 *
 * Note how few run over the European summer: in late July only the Brazilian Série A
 * and Copa Libertadores are active, because every European league starts in August.
 * That's why the ticker looks sparse out of season rather than anything being broken.
 *
 * Europa League and Conference League are NOT on the free tier (they 403). Getting
 * the breadth a site like LiveScore shows means a paid plan or a second provider —
 * see TODO.md.
 */
export const TRACKED_COMPETITIONS = [
  // Europe's big five — August to May
  { code: "PL", name: "Premier League" },
  { code: "PD", name: "La Liga" },
  { code: "SA", name: "Serie A" },
  { code: "BL1", name: "Bundesliga" },
  { code: "FL1", name: "Ligue 1" },
  // Other European
  { code: "CL", name: "Champions League" },
  { code: "DED", name: "Eredivisie" },
  { code: "PPL", name: "Primeira Liga" },
  { code: "ELC", name: "Championship" },
  // South America — runs through the European off-season, so it keeps the
  // ticker populated in June, July and December
  { code: "BSA", name: "Brasileirão" },
  { code: "CLI", name: "Copa Libertadores" },
  // Tournaments — dormant most years, free to include
  { code: "WC", name: "FIFA World Cup" },
  { code: "EC", name: "European Championship" },
] as const;

/** Provider status values, per the v4 docs. */
type ProviderStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

type ProviderMatch = {
  id: number;
  utcDate: string;
  status: ProviderStatus;
  minute?: number | null;
  competition: { name: string; code: string };
  matchday?: number | null;
  homeTeam: { name: string | null; shortName?: string | null };
  awayTeam: { name: string | null; shortName?: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
};

export class FootballDataError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FootballDataError";
  }
}

export function isFootballDataConfigured(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}

/** Requests left in the current minute, as last reported by the provider. */
export function remainingRequests(): number | null {
  return requestsAvailable;
}

/**
 * Self-throttling state, read from the provider's own response headers.
 *
 * football-data.org returns `X-Requests-Available-Minute` and
 * `X-RequestCounter-Reset` on every response, and explicitly asks clients to honour
 * them rather than discovering the limit by getting 429s. Tracking them here means a
 * future multi-request job (standings, for instance) throttles itself instead of
 * hammering the limiter.
 */
let requestsAvailable: number | null = null;
let counterResetsAt = 0;

/** Longest we'll block waiting for the limiter, to stay well inside a function timeout. */
const MAX_WAIT_MS = 8_000;

function recordRateLimit(headers: Headers) {
  const available = Number(headers.get("x-requests-available-minute"));
  const resetIn = Number(headers.get("x-requestcounter-reset"));

  if (Number.isFinite(available)) requestsAvailable = available;
  if (Number.isFinite(resetIn)) counterResetsAt = Date.now() + resetIn * 1000;
}

async function awaitCapacity() {
  if (requestsAvailable === null || requestsAvailable > 0) return;

  const waitMs = counterResetsAt - Date.now();
  if (waitMs <= 0) {
    // Window already rolled over; assume capacity is back.
    requestsAvailable = null;
    return;
  }

  if (waitMs > MAX_WAIT_MS) {
    throw new FootballDataError(
      `Rate limit reached; resets in ${Math.ceil(waitMs / 1000)}s. Skipping this run.`,
      429,
    );
  }

  await new Promise((resolve) => setTimeout(resolve, waitMs + 250));
  requestsAvailable = null;
}

async function request<T>(path: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new FootballDataError(
      "FOOTBALL_DATA_API_KEY is not set. Get a free key at football-data.org/client/register.",
    );
  }

  await awaitCapacity();

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey },
    // Always hit the provider — this runs from a cron job whose whole purpose is
    // fresh data, and Next would otherwise cache the fetch.
    cache: "no-store",
  });

  recordRateLimit(response.headers);

  if (response.status === 429) {
    throw new FootballDataError(
      "Rate limited by football-data.org. The free tier allows 10 requests per minute.",
      429,
    );
  }

  if (response.status === 403) {
    throw new FootballDataError(
      "football-data.org rejected the request. One of the requested competitions may not be on the free tier.",
      403,
    );
  }

  if (!response.ok) {
    throw new FootballDataError(
      `football-data.org returned ${response.status} ${response.statusText}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

/** Our own shape, so nothing downstream depends on the provider's field names. */
export type FeedMatch = {
  externalId: string;
  competition: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  status: MatchStatus;
  meta: string;
  kickoffAt: Date;
  /**
   * Half-time score, as numbers, when the provider has one.
   *
   * The free tier gives no scorers, bookings or referees, so half-time versus full-time
   * is the only thing in the payload that says anything about *how* a match went — a
   * comeback, a second-half collapse, a game settled before the break. The report
   * templates lean on it heavily; without it they could only restate the scoreline.
   */
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  /** League matchday, for context in generated reports. Null in knockout rounds. */
  matchday: number | null;
};

/** Collapses the provider's nine statuses onto the three the site displays. */
function toSiteStatus(status: ProviderStatus): MatchStatus {
  switch (status) {
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "POSTPONED":
    case "CANCELLED":
    case "SUSPENDED":
      return "postponed";
    default:
      return "upcoming";
  }
}

/**
 * The short status line shown on a match card — the field a human used to type by
 * hand. Derived from status and minute so it can never go stale.
 */
function toMeta(match: ProviderMatch, kickoffAt: Date): string {
  switch (match.status) {
    case "IN_PLAY":
      return match.minute ? `${match.minute}'` : "LIVE";
    case "PAUSED":
      return "HT";
    case "FINISHED":
    case "AWARDED":
      return "FT";
    case "POSTPONED":
      return "Postponed";
    case "SUSPENDED":
      return "Suspended";
    case "CANCELLED":
      return "Cancelled";
    default: {
      // Kick-off time in the site's timezone, e.g. "Today 20:00".
      const time = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: SITE_TIMEZONE,
      }).format(kickoffAt);

      const today = new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIMEZONE }).format(new Date());
      const matchDay = new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIMEZONE }).format(kickoffAt);

      if (today === matchDay) return `Today ${time}`;

      const weekday = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        timeZone: SITE_TIMEZONE,
      }).format(kickoffAt);
      return `${weekday} ${time}`;
    }
  }
}

const score = (value: number | null | undefined): string =>
  typeof value === "number" ? String(value) : NO_SCORE;

function toFeedMatch(match: ProviderMatch): FeedMatch | null {
  // Defensive: team names are occasionally null for unconfirmed knockout fixtures.
  if (!match.homeTeam?.name || !match.awayTeam?.name) return null;

  const kickoffAt = new Date(match.utcDate);
  if (Number.isNaN(kickoffAt.getTime())) return null;

  const finishedOrLive = match.status !== "SCHEDULED" && match.status !== "TIMED";

  return {
    externalId: String(match.id),
    competition: match.competition?.name ?? "Football",
    home: match.homeTeam.shortName || match.homeTeam.name,
    away: match.awayTeam.shortName || match.awayTeam.name,
    homeScore: finishedOrLive ? score(match.score?.fullTime?.home) : NO_SCORE,
    awayScore: finishedOrLive ? score(match.score?.fullTime?.away) : NO_SCORE,
    status: toSiteStatus(match.status),
    meta: toMeta(match, kickoffAt),
    kickoffAt,
    // Only meaningful once the match has actually kicked off.
    halfTimeHome: finishedOrLive ? (match.score?.halfTime?.home ?? null) : null,
    halfTimeAway: finishedOrLive ? (match.score?.halfTime?.away ?? null) : null,
    matchday: typeof match.matchday === "number" ? match.matchday : null,
  };
}

/**
 * Fetches matches across all tracked competitions in a date window.
 *
 * One request covers every competition, which matters on a 10-per-minute budget —
 * looping per competition would cost ten requests for the same data.
 */
/** The provider rejects any range longer than this with a 400. */
const MAX_WINDOW_DAYS = 10;

export async function fetchMatches({
  daysBack = 1,
  daysForward = 2,
}: { daysBack?: number; daysForward?: number } = {}): Promise<FeedMatch[]> {
  // Clamp rather than let the provider 400. Widening the window is a tempting
  // one-line change, and the failure it causes ("Specified period must not exceed
  // 10 days") wouldn't obviously point back to here.
  let back = Math.max(0, daysBack);
  let forward = Math.max(0, daysForward);
  if (back + forward + 1 > MAX_WINDOW_DAYS) {
    const scale = (MAX_WINDOW_DAYS - 1) / (back + forward);
    back = Math.floor(back * scale);
    forward = Math.floor(forward * scale);
    console.warn(
      `Requested window exceeds the provider's ${MAX_WINDOW_DAYS}-day limit; clamped to -${back}/+${forward} days.`,
    );
  }

  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const from = new Date(Date.now() - back * 86_400_000);
  const to = new Date(Date.now() + forward * 86_400_000);

  const competitions = TRACKED_COMPETITIONS.map((c) => c.code).join(",");
  const data = await request<{ matches?: ProviderMatch[] }>(
    `/matches?competitions=${competitions}&dateFrom=${iso(from)}&dateTo=${iso(to)}`,
  );

  return (data.matches ?? []).map(toFeedMatch).filter((m): m is FeedMatch => m !== null);
}

/**
 * Competitions we pull league tables for.
 *
 * A subset of TRACKED_COMPETITIONS: only round-robin leagues, because a knockout
 * competition's "standings" are group tables that don't fit a single league table (the
 * Champions League returns one row set per group).
 *
 * `qualifyingPlaces` drives the green highlight in the table and is a **display
 * convention, not a claim about a specific season's allocation** — UEFA's coefficient
 * places move between four and five for the big leagues, and the provider doesn't tell
 * us which applies. Getting it wrong is cosmetic; it never affects a score or a tip.
 *
 * ## Not available on this provider
 *
 * MLS and the Saudi Pro League were both asked for and neither is on football-data.org
 * at any tier — /competitions returns exactly 13 competitions for this key and both
 * return HTTP 403. They need a second provider or manual CMS entry; see TODO.md.
 */
export const STANDINGS_COMPETITIONS = [
  { code: "PL", name: "Premier League", qualifyingPlaces: 4 },
  { code: "PD", name: "La Liga", qualifyingPlaces: 4 },
  { code: "SA", name: "Serie A", qualifyingPlaces: 4 },
  { code: "BL1", name: "Bundesliga", qualifyingPlaces: 4 },
  { code: "FL1", name: "Ligue 1", qualifyingPlaces: 3 },
  // Runs February to December, so it's the one major league with a live table through
  // the European summer — without it the tables sit empty from May to mid-August.
  { code: "BSA", name: "Brasileirão", qualifyingPlaces: 4 },
] as const;

export type StandingsCompetition = (typeof STANDINGS_COMPETITIONS)[number];

/** Our own shape for one row of a league table. */
export type FeedStandingRow = {
  pos: number;
  team: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  qualifying: boolean;
  form: string[];
};

type ProviderStandingRow = {
  position: number;
  team: { name?: string | null; shortName?: string | null };
  playedGames: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form?: string | null;
};

type ProviderStandings = {
  season?: { startDate?: string; endDate?: string; currentMatchday?: number | null };
  standings?: { type?: string; table?: ProviderStandingRow[] }[];
};

export type FeedStandings = {
  /** The season the provider says this table belongs to. */
  season: { startDate: Date | null; endDate: Date | null; currentMatchday: number | null };
  rows: FeedStandingRow[];
};

/**
 * Fetches one competition's league table. Costs a single request.
 *
 * Reads the `TOTAL` table specifically — the response also carries HOME and AWAY
 * splits, and picking the first entry blindly would silently produce a home-only table.
 */
export async function fetchStandings(code: string): Promise<FeedStandings> {
  const data = await request<ProviderStandings>(`/competitions/${code}/standings`);

  const total =
    data.standings?.find((entry) => entry.type === "TOTAL") ?? data.standings?.[0];

  const config = STANDINGS_COMPETITIONS.find((entry) => entry.code === code);
  const qualifyingPlaces = config?.qualifyingPlaces ?? 4;

  const parseDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const rows = (total?.table ?? [])
    .map((row): FeedStandingRow | null => {
      const team = row.team?.shortName || row.team?.name;
      if (!team || typeof row.position !== "number") return null;

      return {
        pos: row.position,
        team,
        played: row.playedGames ?? 0,
        goalsFor: row.goalsFor ?? 0,
        goalsAgainst: row.goalsAgainst ?? 0,
        points: row.points ?? 0,
        qualifying: row.position <= qualifyingPlaces,
        // "W,W,L,D,W" -> ["W","W","L","D","W"]. Absent early in a season.
        form: (row.form ?? "").split(",").map((f) => f.trim()).filter(Boolean),
      };
    })
    .filter((row): row is FeedStandingRow => row !== null);

  return {
    season: {
      startDate: parseDate(data.season?.startDate),
      endDate: parseDate(data.season?.endDate),
      currentMatchday: data.season?.currentMatchday ?? null,
    },
    rows,
  };
}

/**
 * Whether a table is safe to publish.
 *
 * The provider is inconsistent before a season starts, in two different ways — verified
 * against all five leagues on 2026-07-30, three weeks before the 2026/27 kick-offs:
 *
 *  - Premier League, La Liga and Bundesliga returned **last season's final table** under
 *    the new season's metadata (760 total games played across 20 teams — exactly 38 each).
 *    Publishing it would have shown Arsenal on 85 points before a ball was kicked.
 *  - Serie A and Ligue 1 returned a correctly zeroed new-season table, where all 20 teams
 *    share position 1. That renders as visual nonsense and, since qualification is derived
 *    from position, marked every team as a European qualifier.
 *
 * Both are wrong to show, and on a site with betting tips beside the table, a league
 * table that looks current and isn't is a factual error a reader could act on. So a table
 * is only published once its season has actually started and at least one game is in it.
 */
export function isPublishableTable(standings: FeedStandings): { ok: boolean; reason?: string } {
  const { season, rows } = standings;

  if (rows.length === 0) return { ok: false, reason: "the provider returned no rows" };

  if (season.startDate && season.startDate.getTime() > Date.now()) {
    return {
      ok: false,
      reason: `the season doesn't start until ${season.startDate.toISOString().slice(0, 10)}`,
    };
  }

  if (!rows.some((row) => row.played > 0)) {
    return { ok: false, reason: "no matches have been played yet" };
  }

  // Distinct positions are what make a table a table. Equal positions across the board is
  // the zeroed-preseason shape; it would also make the qualification highlight meaningless.
  if (new Set(rows.map((row) => row.pos)).size !== rows.length) {
    return { ok: false, reason: "the provider returned duplicate positions" };
  }

  return { ok: true };
}
