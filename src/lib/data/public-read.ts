/**
 * Wraps a public-site database read so an outage degrades the page instead of breaking it.
 *
 * Without this, every read helper throws when Mongo is unreachable, and a single failing
 * widget takes the whole route down — a homepage of eight sections becomes one 500
 * because a sidebar table couldn't be fetched. For a site whose whole point is loading
 * fast and working on a weak connection, rendering the sections we *do* have is the
 * right failure mode: the reader still gets scores, tips and headlines rather than an
 * error page.
 *
 * ## Deliberately public-only
 *
 * Do **not** use this in the CMS or in a Server Action.
 *
 * An admin looking at an empty articles list would reasonably conclude their content had
 * been deleted, and a mutation that silently swallowed a connection failure would tell
 * an editor their edit saved when it didn't. Those paths must fail loudly and visibly.
 * Quiet degradation is only correct where the alternative is showing a reader an error
 * page for something they didn't ask about.
 */

/** Throttles the log so an outage doesn't write a line per widget per request. */
let lastLoggedAt = 0;
const LOG_INTERVAL_MS = 10_000;

export async function publicRead<T>(
  /** Helper name, for the server log. */
  label: string,
  /** What the page should render instead — an empty list, or null for a single item. */
  fallback: T,
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    const now = Date.now();

    if (now - lastLoggedAt > LOG_INTERVAL_MS) {
      lastLoggedAt = now;
      console.error(
        `Public read failed (${label}); rendering without it. ` +
          `${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      );
    }

    return fallback;
  }
}
