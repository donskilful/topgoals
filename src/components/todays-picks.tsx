import Link from "next/link";
import { getTodaysTips } from "@/lib/data/tips";
import { SITE_TIMEZONE_LABEL } from "@/lib/constants";

function ConfidenceDots({ level }: { level: number }) {
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

export async function TodaysPicks() {
  const tips = await getTodaysTips();

  return (
    <div>
      <div className="mb-[18px] flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-[26px] font-normal uppercase tracking-wide lg:text-[32px]">
            Today&apos;s Picks
          </h3>
          <div className="text-[13px] text-floodlight-dim">
            Published ahead of kick-off, all times {SITE_TIMEZONE_LABEL}
          </div>
        </div>
        <Link
          href="/tips"
          className="whitespace-nowrap text-[13px] font-bold text-pitch-bright hover:underline"
        >
          All tips →
        </Link>
      </div>

      {tips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-charcoal p-6 text-center">
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
            </div>
            <div className="text-right font-mono text-[15px] font-bold">
              {tip.odds}
              <span className="block font-body text-[10px] font-semibold uppercase tracking-wide text-floodlight-faint">
                Odds
              </span>
              <ConfidenceDots level={tip.confidence} />
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
