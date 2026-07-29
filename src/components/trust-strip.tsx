import { getRecentResults, getTipStats } from "@/lib/data/tips";

export async function TrustStrip() {
  const [{ results, label }, stats] = await Promise.all([getRecentResults(), getTipStats()]);

  // With no settled tips there's no track record to show, and an empty strip under a
  // "results" heading would read worse than no strip at all.
  if (results.length === 0 && !stats.hasData) return null;

  return (
    <section className="border-b border-dashed border-line bg-ink">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-[22px] 2xl:max-w-[1320px]">
        {results.length > 0 ? (
          <div className="flex items-center gap-3.5">
            <h2 className="font-display text-[15px] font-normal uppercase tracking-wide text-floodlight-dim">
              {label}
            </h2>
            <div className="flex gap-1.5">
              {results.map((tip) => (
                <span
                  key={tip.id}
                  title={tip.result === "W" ? "Won" : "Lost"}
                  className={`rounded-[5px] px-[9px] py-1 font-mono text-xs font-bold ${
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
        ) : (
          <span />
        )}

        <div className="font-mono text-[13px] text-floodlight-dim">
          {stats.period}:{" "}
          {stats.hasData ? (
            <>
              <b className="font-bold text-torch">{stats.winRate} win rate</b> · {stats.units}
            </>
          ) : (
            <span>{stats.units}</span>
          )}
        </div>
      </div>
    </section>
  );
}
