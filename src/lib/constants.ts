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

/** CMS routes only administrators may open. Moderators are redirected away. */
export const ADMIN_ONLY_PREFIXES = ["/admin/users"] as const;

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

export const MATCH_STATUSES = ["live", "finished", "upcoming"] as const;
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
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/** Until multiple leagues are supported, every standings row belongs to this table. */
export const DEFAULT_COMPETITION = "Premier League";

/** Formats a goal difference the way the table displays it: "+31", "-4", "0". */
export function formatGoalDifference(goalsFor: number, goalsAgainst: number): string {
  const diff = goalsFor - goalsAgainst;
  return diff > 0 ? `+${diff}` : String(diff);
}
