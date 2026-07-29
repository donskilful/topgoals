import { yesterdaysTips, tipStats } from "@/lib/mock-data";

export function TrustStrip() {
  return (
    <section className="border-b border-dashed border-line bg-ink">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-[22px] 2xl:max-w-[1320px]">
        <div className="flex items-center gap-3.5">
          <h2 className="font-display text-[15px] font-normal uppercase tracking-wide text-floodlight-dim">
            Yesterday&apos;s Tips
          </h2>
          <div className="flex gap-1.5">
            {yesterdaysTips.map((tip) => (
              <span
                key={tip.id}
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
        <div className="font-mono text-[13px] text-floodlight-dim">
          {tipStats.period}: <b className="font-bold text-torch">{tipStats.winRate} win rate</b> · {tipStats.units}
        </div>
      </div>
    </section>
  );
}
