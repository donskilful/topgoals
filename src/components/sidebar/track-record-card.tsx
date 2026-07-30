import Link from "next/link";
import { getRecentResults, getTipStats } from "@/lib/data/tips";

/**
 * Replaces the old newsletter signup, which promised tips "straight to Telegram"
 * behind a button that did nothing. Tips live on the site, so this shows the real
 * track record instead — computed from settled tips, never typed in by hand.
 */
export async function TrackRecordCard() {
  const [stats, { results, label }] = await Promise.all([getTipStats(), getRecentResults(5)]);

  return (
    <div className="rounded-xl border border-line bg-charcoal p-4">
      <h4 className="mb-3 font-display text-[15px] font-normal uppercase tracking-wide">
        Our Track Record
      </h4>

      {stats.hasData ? (
        <>
          <div className="mb-3 flex items-baseline gap-4">
            <div>
              <p className="font-mono text-3xl font-bold leading-none text-torch">
                {stats.winRate}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-floodlight-faint">
                Win rate
              </p>
            </div>
            <div>
              <p className="font-mono text-xl font-bold leading-none">{stats.units}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-floodlight-faint">
                At 1 unit a tip
              </p>
            </div>
          </div>

          {results.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-floodlight-faint">
                {label}
              </p>
              <div className="flex gap-1.5">
                {results.map((tip) => (
                  <span
                    key={tip.id}
                    title={tip.result === "W" ? "Won" : "Lost"}
                    className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                      tip.result === "W"
                        ? "bg-[rgba(22,163,94,0.16)] text-pitch-bright"
                        : "bg-[rgba(255,71,87,0.14)] text-whistle"
                    }`}
                  >
                    {tip.result}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mb-3 text-[12px] leading-relaxed text-floodlight-dim">
            Calculated from every settled tip over the {stats.period.toLowerCase()} — losses
            included.
          </p>
        </>
      ) : (
        <p className="mb-3 text-[12.5px] leading-relaxed text-floodlight-dim">
          No tips have settled yet. Once they do, our running win rate and profit appear here —
          losses and all.
        </p>
      )}

      <Link
        href="/tips"
        className="inline-block rounded-lg bg-pitch px-3.5 py-2 text-[13px] font-bold text-floodlight transition-colors hover:bg-pitch-bright hover:text-ink"
      >
        See today&apos;s tips →
      </Link>
    </div>
  );
}
