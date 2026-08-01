import Link from "next/link";
import { getHighlights } from "@/lib/data/highlights";
import { SectionMoreLink } from "@/components/section-more-link";

/**
 * Hard cap on clips shown on the homepage.
 *
 * Three, never more: this column is half of a two-column row, and a fourth clip would push the
 * row taller than the picks beside it can sensibly fill. The rest live on /highlights, one click
 * away. Fewer render only when fewer exist — a shortfall is a content gap for an editor to fill,
 * and padding it with repeats would be worse than showing what there is.
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

      {/*
        The clips share whatever height this column ends up with, rather than each claiming a
        fixed 16:10 box. The column's height is set by whichever of the two columns is taller, so
        a fixed aspect ratio left dead space under the last clip whenever the picks beside it ran
        longer. Stretching absorbs it — the thumbnails are `object-cover`, so they crop a little
        rather than distort. `min-h` keeps a clip recognisable if the row is ever short.

        Stretching applies from `md` up only — the breakpoint where the two columns exist. Once
        they stack there is no sibling to match and nothing to grow into, so `flex-1` collapsed
        every clip to its minimum. Below `md` the original 16:10 box is the right shape.
      */}
      <div className="mb-3 flex flex-1 flex-col gap-3">
        {clips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-charcoal p-6 text-center">
            <p className="text-sm text-floodlight-dim">No clips yet.</p>
          </div>
        ) : (
          clips.map((clip) => (
            <Link
              key={clip.id}
              href="/highlights"
              className="group relative flex aspect-16/10 cursor-pointer items-end overflow-hidden rounded-xl border border-line bg-linear-to-br from-charcoal-3 to-charcoal transition-colors hover:border-[rgba(245,185,66,0.35)] md:aspect-auto md:min-h-[150px] md:flex-1"
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
      </div>

      <SectionMoreLink href="/highlights">View more highlights →</SectionMoreLink>
    </div>
  );
}
