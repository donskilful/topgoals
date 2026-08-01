/**
 * Shared enums and pure helpers with NO Mongoose (or any server-only) imports.
 *
 * Client Components, Zod schemas and the edge-runtime auth config all need these
 * values. Importing them from a Mongoose model file would drag the whole ODM into
 * the browser bundle and break the edge proxy, so they live here instead and the
 * models import from this file.
 */

export const USER_ROLES = ["admin", "moderator", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles allowed into the CMS. `user` is scaffolded for future public accounts. */
export const STAFF_ROLES = ["admin", "moderator"] as const satisfies readonly UserRole[];

export function isStaffRole(role: unknown): role is (typeof STAFF_ROLES)[number] {
  return typeof role === "string" && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

/**
 * Password-hash sentinel for accounts that must never be able to sign in.
 *
 * Currently just the automation identity the audit log attributes cron writes to (see
 * `src/lib/automation-actor.ts`). Deliberately not a bcrypt hash: `authorize()` checks
 * for it and refuses the account before any password comparison runs.
 *
 * Lives here rather than beside the automation actor so the auth config can read it
 * without importing a module that pulls in Mongoose.
 */
export const UNUSABLE_PASSWORD_HASH = "!automation-no-login";

/** CMS routes only administrators may open. Moderators are redirected away. */
export const ADMIN_ONLY_PREFIXES = ["/admin/users", "/admin/activity-log"] as const;

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const ARTICLE_CATEGORIES = ["News", "Transfer"] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const TIP_RESULTS = ["pending", "won", "lost", "void"] as const;
export type TipResultStatus = (typeof TIP_RESULTS)[number];

export const TIP_CONFIDENCE_LEVELS = [1, 2, 3, 4] as const;
export type TipConfidence = (typeof TIP_CONFIDENCE_LEVELS)[number];

/**
 * "postponed" covers the provider's POSTPONED, CANCELLED and SUSPENDED states.
 * Kept distinct from "upcoming" because such a fixture is neither imminent nor
 * played, and showing it in a glanceable "Live & Upcoming" ticker is just noise —
 * the full /scores list still reports it, where the information is useful.
 */
export const MATCH_STATUSES = ["live", "finished", "upcoming", "postponed"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** En dash — shown in place of a score before kickoff. */
export const NO_SCORE = "–";

export const MESSAGE_TOPICS = [
  "Correction",
  "General enquiry",
  "Feedback",
  "Advertising",
  "Press",
] as const;
export type MessageTopic = (typeof MESSAGE_TOPICS)[number];

export const AUDIT_ACTIONS = ["create", "update", "delete"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "Article",
  "Tip",
  "Highlight",
  "Match",
  "StandingRow",
  "User",
  "Message",
  /**
   * Not a collection: a hand-triggered run of one of the automated jobs, keyed by job name.
   *
   * Worth logging alongside content edits because it answers the same question the audit trail
   * exists for. An automated job rewrites content across the site, so "why did forty articles
   * change at 2am?" needs "an admin pressed Update on the news job" to be answerable.
   */
  "Automation",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/**
 * The site's editorial timezone: GMT+1 year-round.
 *
 * Africa/Lagos rather than a raw "+01:00" because it's a real IANA zone Intl
 * accepts, and it observes no daylight saving — so kick-off times never shift by an
 * hour twice a year the way a Europe/* zone would.
 *
 * Everything user-facing is rendered in this zone, and datetime-local inputs in the
 * CMS are both written and parsed in it, so what an editor types is what readers see
 * regardless of where the server runs.
 */
export const SITE_TIMEZONE = "Africa/Lagos";

/** Fixed UTC offset matching SITE_TIMEZONE, for parsing datetime-local strings. */
export const SITE_UTC_OFFSET = "+01:00";

/** Shown next to times so readers know which clock they're looking at. */
export const SITE_TIMEZONE_LABEL = "GMT+1";

/**
 * Shorter display names for competitions whose official name is unwieldy.
 *
 * Applied where provider data enters the system, so one league has exactly one name
 * everywhere. Without it the same competition appeared as "Brasileirão" on the standings
 * tab and "Campeonato Brasileiro Série A" in match reports and the score ticker — where it
 * truncated to "CAMPEONATO B..." and told the reader nothing.
 */
const COMPETITION_DISPLAY_NAMES: Record<string, string> = {
  "Campeonato Brasileiro Série A": "Brasileirão",
  "Primera Division": "La Liga",
  "Primera División": "La Liga",
  "UEFA Champions League": "Champions League",
  "Copa Libertadores": "Copa Libertadores",
  "Championship": "Championship",
  "Primeira Liga": "Primeira Liga",
  "FIFA World Cup": "World Cup",
  "European Championship": "Euros",
};

export function competitionDisplayName(name: string): string {
  return COMPETITION_DISPLAY_NAMES[name.trim()] ?? name.trim();
}

/** Until multiple leagues are supported, every standings row belongs to this table. */
export const DEFAULT_COMPETITION = "Premier League";

/** Formats a goal difference the way the table displays it: "+31", "-4", "0". */
export function formatGoalDifference(goalsFor: number, goalsAgainst: number): string {
  const diff = goalsFor - goalsAgainst;
  return diff > 0 ? `+${diff}` : String(diff);
}
