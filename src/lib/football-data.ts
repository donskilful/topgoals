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
export const TRACKED_COMPETITIONS = [
  { code: "PL", name: "Premier League" },
  { code: "PD", name: "La Liga" },
  { code: "SA", name: "Serie A" },
  { code: "BL1", name: "Bundesliga" },
  { code: "FL1", name: "Ligue 1" },
  { code: "CL", name: "Champions League" },
  { code: "DED", name: "Eredivisie" },
  { code: "PPL", name: "Primeira Liga" },
  { code: "ELC", name: "Championship" },
  { code: "BSA", name: "Brasileirão" },
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

async function request<T>(path: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new FootballDataError(
      "FOOTBALL_DATA_API_KEY is not set. Get a free key at football-data.org/client/register.",
    );
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey },
    // Always hit the provider — this runs from a cron job whose whole purpose is
    // fresh data, and Next would otherwise cache the fetch.
    cache: "no-store",
  });

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
  };
}

/**
 * Fetches matches across all tracked competitions in a date window.
 *
 * One request covers every competition, which matters on a 10-per-minute budget —
 * looping per competition would cost ten requests for the same data.
 */
export async function fetchMatches({
  daysBack = 1,
  daysForward = 2,
}: { daysBack?: number; daysForward?: number } = {}): Promise<FeedMatch[]> {
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const from = new Date(Date.now() - daysBack * 86_400_000);
  const to = new Date(Date.now() + daysForward * 86_400_000);

  const competitions = TRACKED_COMPETITIONS.map((c) => c.code).join(",");
  const data = await request<{ matches?: ProviderMatch[] }>(
    `/matches?competitions=${competitions}&dateFrom=${iso(from)}&dateTo=${iso(to)}`,
  );

  return (data.matches ?? []).map(toFeedMatch).filter((m): m is FeedMatch => m !== null);
}
