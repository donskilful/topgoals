import type { Model } from "mongoose";

/** Turns "Mbappé completes move to Real Madrid!" into "mbappe-completes-move-to-real-madrid". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    // Strip combining accents so "é" becomes "e" rather than being dropped.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Builds a slug that no other document is using, appending -2, -3, ... on collision.
 * `excludeId` lets an article keep its own slug when being edited.
 */
export async function uniqueSlug(
  model: Model<{ slug: string }>,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title) || "article";
  let candidate = base;
  let suffix = 1;

  // Bounded rather than while(true) so a pathological case can't spin forever.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const clash = await model
      .findOne({
        slug: candidate,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .select("_id")
      .lean();

    if (!clash) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  // Fall back to a timestamp rather than throwing and blocking a legitimate save.
  return `${base}-${Date.now()}`;
}
