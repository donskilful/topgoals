import Link from "next/link";
import { highlights } from "@/lib/mock-data";

export function GoalsHighlights() {
  return (
    <div>
      <div className="mb-[18px]">
        <h3 className="font-display text-[26px] font-normal uppercase tracking-wide lg:text-[32px]">
          Goals &amp; Highlights
        </h3>
        <div className="text-[13px] text-floodlight-dim">Clipped within minutes of full time</div>
      </div>

      {highlights.map((clip) => (
        <Link
          key={clip.id}
          href="#"
          className="group relative mb-3 flex aspect-16/10 cursor-pointer items-end overflow-hidden rounded-xl border border-line bg-linear-to-br from-charcoal-3 to-charcoal transition-colors hover:border-[rgba(245,185,66,0.35)]"
        >
          <div className="absolute left-1/2 top-1/2 flex h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(243,245,240,0.25)] bg-[rgba(243,245,240,0.14)] backdrop-blur-sm transition-all group-hover:scale-110 group-hover:border-torch group-hover:bg-[rgba(245,185,66,0.85)]">
            <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-floodlight group-hover:border-l-ink" />
          </div>
          <div className="relative z-10 w-full bg-linear-to-t from-ink/90 to-transparent px-3.5 py-3">
            <div className="mb-0.5 font-mono text-[11px] text-torch">{clip.duration}</div>
            <div className="text-[13px] font-bold">{clip.title}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
