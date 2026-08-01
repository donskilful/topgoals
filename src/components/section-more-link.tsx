import Link from "next/link";

/**
 * The "view more" control at the foot of a homepage column.
 *
 * `mt-auto` is the load-bearing part. The two columns it appears in are grid siblings, so they
 * are already stretched to the same height; pushing the link to the bottom of each makes both
 * sections finish on the same line however much content sits above. Without it the shorter
 * column's link floats mid-page against the taller one and the row looks broken.
 *
 * Shared rather than written twice so the two never drift apart visually — they sit side by side,
 * where any difference would be obvious.
 */
export function SectionMoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-auto block rounded-xl border border-line bg-charcoal px-4 py-3 text-center text-[13px] font-bold text-pitch-bright transition-colors hover:border-[rgba(34,201,116,0.35)] hover:bg-charcoal-3"
    >
      {children}
    </Link>
  );
}
