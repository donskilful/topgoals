import Link from "next/link";
import { getTrendingTips } from "@/lib/data/tips";

export async function TrendingTips() {
  const tips = await getTrendingTips();

  if (tips.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-charcoal p-4">
      <h4 className="mb-3 font-display text-[15px] font-normal uppercase tracking-wide">
        Trending Tips
      </h4>
      {tips.map((tip, i) => (
        <Link
          key={tip.id}
          href="/tips"
          className={`flex items-center justify-between gap-2.5 py-[9px] ${
            i === tips.length - 1 ? "" : "border-b border-line"
          }`}
        >
          <div>
            <div className="text-[12.5px] font-semibold">{tip.fixture}</div>
            <div className="mt-[5px] inline-flex items-center gap-1.5 rounded-md bg-[rgba(245,185,66,0.12)] px-2 py-[3px] text-[11px] font-bold text-torch">
              ⚽ {tip.pick}
            </div>
          </div>
          <div className="font-mono text-[13px] font-bold">{tip.odds}</div>
        </Link>
      ))}
    </div>
  );
}
