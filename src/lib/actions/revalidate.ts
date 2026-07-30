import { revalidatePath } from "next/cache";

/**
 * Public routes affected by each content type.
 *
 * These reads go through Mongoose rather than `fetch`, so Next's Data Cache can't
 * invalidate them automatically — without an explicit revalidate, a CMS edit
 * wouldn't appear on the live site until the next deploy. Some of these routes
 * arrive in a later phase; revalidating a path that doesn't exist yet is a no-op.
 */
const PUBLIC_PATHS = {
  article: ["/", "/news", "/transfers"],
  tip: ["/", "/tips"],
  highlight: ["/", "/highlights"],
  match: ["/", "/scores"],
  standing: ["/", "/scores"],
} as const;

/**
 * Busts the caches for a content type after a change.
 *
 * Deliberately never throws. `revalidatePath` requires Next's request context, so it
 * fails outright when called from a plain script — a backfill, a one-off fix, or a
 * cron job driven by an external scheduler. Since this runs *after* the data is
 * already written, letting it throw would report a failure for work that actually
 * succeeded. A missed revalidation just means the page refreshes on its own timer
 * instead of immediately.
 */
export function revalidateContent(type: keyof typeof PUBLIC_PATHS, adminPath: string) {
  try {
    for (const path of PUBLIC_PATHS[type]) revalidatePath(path);
    revalidatePath(adminPath);
  } catch {
    // Outside a request context (scripts, tests). The data write already happened;
    // affected pages fall back to their own revalidation window.
  }
}
