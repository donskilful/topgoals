import { SITE_TIMEZONE } from "@/lib/constants";

/**
 * Every formatter here is pinned to the site's timezone (GMT+1) rather than the
 * server's, so a kick-off time reads the same whether the page was rendered in
 * Lagos, London or a US datacentre.
 */

/** "29 Jul 2026, 20:00" — full timestamp, used in the CMS. */
export const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: SITE_TIMEZONE,
});

/** "29 July 2026 at 20:00" — article bylines. */
export const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: SITE_TIMEZONE,
});

/** "Wed 29 Jul" — compact date for tip listings. */
export const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: SITE_TIMEZONE,
});

/** "20:00" — kick-off times on cards. */
export const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: SITE_TIMEZONE,
});

/**
 * Renders a timestamp as "2 hours ago".
 *
 * Computed at render time rather than stored, so it can never go stale — the mock
 * data used to hard-code strings like "2 hours ago", which stopped being true the
 * moment it wasn't "now". Timezone-independent: it's a duration, not a clock time.
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Formats stored seconds as the mm:ss shown on a highlight card. */
export function formatClipLength(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Kick-off time as shown on a tip or match card, e.g. "20:00" in GMT+1. */
export function formatKickoffTime(date: Date): string {
  return timeFormatter.format(date);
}
