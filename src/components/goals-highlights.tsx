import Link from "next/link";
import { getHighlights } from "@/lib/data/highlights";
import { SectionMoreLink } from "@/components/section-more-link";

/**
 * Clips shown on the homepage.
 *
 * Three is the target: it's what balances the column against Today's Picks beside it, and two
 * clips left the section looking half-finished. Fewer render only when fewer exist — the
 * shortfall is a content gap for an editor to fill, and padding it with repeats would be worse
 * than showing what there is.
 */
const HOMEPAGE_CLIPS = 3;

export async function GoalsHighlights() {
  const clips = await getHighlights(HOMEPAGE_CLIPS);

  return (
    // Full-height flex column so the "All highlights" link can sit at the very bottom, level
    // with the one under the tips beside it.
    <div className="flex h-full flex-col">
      <div className="mb-[18px]">
        <h3 className="font-display text-[26px] font-normal uppercase tracking-wide lg:text-[32px]">
          Goals &amp; Highlights
        </h3>
        <div className="text-[13px] text-floodlight-dim">The moments worth watching again</div>
      </div>

      {clips.length === 0 ? (
        <div className="mb-3 rounded-xl border border-dashed border-line bg-charcoal p-6 text-center">
          <p className="text-sm text-floodlight-dim">No clips yet.</p>
        </div>
      ) : (
        clips.map((clip) => (
          <Link
            key={clip.id}
            href="/highlights"
            className="group relative mb-3 flex aspect-16/10 cursor-pointer items-end overflow-hidden rounded-xl border border-line bg-linear-to-br from-charcoal-3 to-charcoal transition-colors hover:border-[rgba(245,185,66,0.35)]"
          >
            {clip.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clip.thumbnailUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                loading="lazy"
              />
            ) : null}

            <div className="absolute left-1/2 top-1/2 flex h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(243,245,240,0.25)] bg-[rgba(243,245,240,0.14)] backdrop-blur-sm transition-all group-hover:scale-110 group-hover:border-torch group-hover:bg-[rgba(245,185,66,0.85)]">
              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-floodlight group-hover:border-l-ink" />
            </div>

            <div className="relative z-10 w-full bg-linear-to-t from-ink/90 to-transparent px-3.5 py-3">
              <div className="mb-0.5 font-mono text-[11px] text-torch">{clip.duration}</div>
              <div className="text-[13px] font-bold">{clip.title}</div>
            </div>
          </Link>
        ))
      )}

      <SectionMoreLink href="/highlights">View more highlights →</SectionMoreLink>
    </div>
  );
}
