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

export function revalidateContent(type: keyof typeof PUBLIC_PATHS, adminPath: string) {
  for (const path of PUBLIC_PATHS[type]) revalidatePath(path);
  revalidatePath(adminPath);
}
