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
