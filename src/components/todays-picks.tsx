import Link from "next/link";
import { getTodaysTips } from "@/lib/data/tips";
import { SITE_TIMEZONE_LABEL } from "@/lib/constants";
import { SectionMoreLink } from "@/components/section-more-link";

/**
 * Renders nothing when a tip has no confidence rating.
 *
 * Ingested provider picks aren't rated by us, and four empty dots would read as "rated zero"
 * — a judgement we never made.
 */
function ConfidenceDots({ level }: { level: number | null }) {
  if (level === null) return null;

  return (
    <div
      className="mt-1.5 flex justify-end gap-0.5"
      title={`Confidence ${level} of 4`}
      aria-label={`Confidence ${level} of 4`}
    >
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= level ? "bg-pitch-bright" : "bg-line"}`}
        />
      ))}
    </div>
  );
}

/**
 * Picks shown on the homepage.
 *
 * Six rather than three, because this column sits beside Goals & Highlights and three tip cards
 * came up well short of three video thumbnails, leaving the row visibly lopsided. Six is roughly
 * the height of that column; the rest are a click away on /tips, which lists every selection.
 */
const HOMEPAGE_TIPS = 6;

export async function TodaysPicks() {
  const tips = await getTodaysTips(HOMEPAGE_TIPS);

  return (
    // Full-height flex column so the footer link lands level with the one beside it.
    <div className="flex h-full flex-col">
      <div className="mb-[18px]">
        <h3 className="font-display text-[26px] font-normal uppercase tracking-wide lg:text-[32px]">
          Today&apos;s Picks
        </h3>
        <div className="text-[13px] text-floodlight-dim">
          Published ahead of kick-off, all times {SITE_TIMEZONE_LABEL}
        </div>
      </div>

      {tips.length === 0 ? (
        <div className="mb-3 rounded-xl border border-dashed border-line bg-charcoal p-6 text-center">
          <p className="text-sm text-floodlight-dim">
            No tips posted yet today. Check back before the first kick-off.
          </p>
        </div>
      ) : (
        tips.map((tip) => (
          <Link
            key={tip.id}
            href="/tips"
            className="mb-3 grid cursor-pointer grid-cols-[1fr_auto] items-center gap-2.5 rounded-xl border border-line bg-charcoal p-4 transition-all hover:-translate-y-0.5 hover:border-[rgba(245,185,66,0.3)] hover:shadow-[0_8px_20px_-12px_rgba(245,185,66,0.35)]"
          >
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-floodlight-faint">
                {tip.competition} · {tip.kickoff}
              </div>
              <div className="text-sm font-bold">{tip.fixture}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[rgba(245,185,66,0.12)] px-2.5 py-[5px] text-xs font-bold text-torch">
                ⚽ {tip.pick}
              </div>
              {/* Credited when the selection isn't ours. A reader deciding whether to back a pick
                  is entitled to know whose opinion it actually is. */}
              {tip.source ? (
                <div className="mt-1.5 text-[10px] text-floodlight-faint">
                  Selection via {tip.source.name}
                </div>
              ) : null}
            </div>
            <div className="text-right font-mono text-[15px] font-bold">
              {/* An em dash, not a plausible-looking price, when the source published none. */}
              {tip.odds ?? "—"}
              <span className="block font-body text-[10px] font-semibold uppercase tracking-wide text-floodlight-faint">
                Odds
              </span>
              <ConfidenceDots level={tip.confidence} />
            </div>
          </Link>
        ))
      )}

      <SectionMoreLink href="/tips">View all tips →</SectionMoreLink>
    </div>
  );
}
