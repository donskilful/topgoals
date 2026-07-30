import type { Metadata } from "next";
import { getAllTips, getTipStats } from "@/lib/data/tips";
import { dayFormatter } from "@/lib/format";
import { SITE_TIMEZONE_LABEL } from "@/lib/constants";
import { EmptyNotice, PageIntro, PublicPage } from "@/components/public-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Daily Football Betting Tips & Results — TopGoals",
  description:
    "Today's football betting tips with the odds, our confidence rating, and an honest, fully published record of how previous tips settled.",
};

const RESULT_STYLES = {
  pending: "bg-charcoal-3 text-floodlight-dim",
  won: "bg-[rgba(22,163,94,0.16)] text-pitch-bright",
  lost: "bg-[rgba(255,71,87,0.14)] text-whistle",
  void: "bg-charcoal-3 text-floodlight-faint",
} as const;

const RESULT_LABELS = {
  pending: "Pending",
  won: "Won",
  lost: "Lost",
  void: "Void",
} as const;


export default async function TipsPage() {
  const [tips, stats] = await Promise.all([getAllTips(60), getTipStats()]);

  const pending = tips.filter((tip) => tip.result === "pending");
  const settled = tips.filter((tip) => tip.result !== "pending");

  return (
    <PublicPage>
      <PageIntro
        title="Betting Tips"
        description={`Every tip we post, with the odds we posted them at — and every result, win or lose. We publish the losses because a tipster who only shows winners isn't telling you anything useful. Kick-off times ${SITE_TIMEZONE_LABEL}.`}
      />

      {stats.hasData ? (
        <div className="mb-8 flex flex-wrap gap-3">
          <div className="rounded-xl border border-line bg-charcoal px-4 py-3">
            <p className="font-mono text-2xl font-bold text-torch">{stats.winRate}</p>
            <p className="text-[11px] uppercase tracking-wide text-floodlight-faint">
              Win rate · {stats.period.toLowerCase()}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-charcoal px-4 py-3">
            <p className="font-mono text-2xl font-bold">{stats.units}</p>
            <p className="text-[11px] uppercase tracking-wide text-floodlight-faint">
              Profit at 1 unit a tip
            </p>
          </div>
        </div>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl uppercase tracking-wide">Upcoming</h2>
        {pending.length === 0 ? (
          <EmptyNotice>No open tips right now. New picks are posted daily by 09:00 GMT.</EmptyNotice>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pending.map((tip) => (
              <div
                key={tip.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-line bg-charcoal p-4"
              >
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-floodlight-faint">
                    {tip.competition} · {dayFormatter.format(new Date(tip.kickoffAt))} {tip.kickoff}
                  </div>
                  <div className="text-sm font-bold">{tip.fixture}</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[rgba(245,185,66,0.12)] px-2.5 py-[5px] text-xs font-bold text-torch">
                    ⚽ {tip.pick}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[15px] font-bold">{tip.odds}</p>
                  <p className="font-body text-[10px] font-semibold uppercase tracking-wide text-floodlight-faint">
                    Odds
                  </p>
                  <div className="mt-1.5 flex justify-end gap-0.5" title={`Confidence ${tip.confidence} of 4`}>
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${i <= tip.confidence ? "bg-pitch-bright" : "bg-line"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl uppercase tracking-wide">Settled</h2>
        {settled.length === 0 ? (
          <EmptyNotice>Nothing settled yet — results appear here after each match.</EmptyNotice>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Date", "Fixture", "Selection", "Odds", "Result"].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-line px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settled.map((tip, i) => {
                  const border = i === settled.length - 1 ? "" : "border-b border-line";
                  return (
                    <tr key={tip.id}>
                      <td className={`px-4 py-3 font-mono text-[11px] text-floodlight-dim ${border}`}>
                        {dayFormatter.format(new Date(tip.kickoffAt))}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${border}`}>{tip.fixture}</td>
                      <td className={`px-4 py-3 text-floodlight-dim ${border}`}>{tip.pick}</td>
                      <td className={`px-4 py-3 font-mono ${border}`}>{tip.odds}</td>
                      <td className={`px-4 py-3 ${border}`}>
                        <span
                          className={`rounded px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${RESULT_STYLES[tip.result]}`}
                        >
                          {RESULT_LABELS[tip.result]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 rounded-lg border border-line bg-charcoal px-4 py-3 text-[12px] leading-relaxed text-floodlight-dim">
        <b className="text-whistle">18+</b> These are opinions, not predictions, and no tip is
        ever a sure thing. Odds shown are those available when the tip was published and will
        move. Never stake money you can&apos;t afford to lose.
      </p>
    </PublicPage>
  );
}
