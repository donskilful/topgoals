import type { Metadata } from "next";
import { getTickerMatches } from "@/lib/data/matches";
import { getStandings } from "@/lib/data/standings";
import { DEFAULT_COMPETITION, SITE_TIMEZONE_LABEL } from "@/lib/constants";
import { EmptyNotice, PageIntro, PublicPage } from "@/components/public-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Live Football Scores — TopGoals",
  description:
    "Live and upcoming football scores across the Premier League, La Liga, Serie A, Bundesliga and Ligue 1, plus the current league table.",
};

const STATUS_STYLES = {
  live: "text-whistle",
  finished: "text-pitch-bright",
  upcoming: "text-floodlight-faint",
} as const;

export default async function ScoresPage() {
  const [matches, standings] = await Promise.all([getTickerMatches(50), getStandings(20)]);

  return (
    <PublicPage>
      <PageIntro
        title="Live Scores"
        description={`Every match we're following today, ordered with anything in play first. All times ${SITE_TIMEZONE_LABEL}.`}
      />

      <div className="grid grid-cols-1 items-start gap-9 lg:grid-cols-[1fr_336px]">
        <section>
          {matches.length === 0 ? (
            <EmptyNotice>No matches are listed right now. Check back closer to kick-off.</EmptyNotice>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-line bg-charcoal">
              {matches.map((match, i) => (
                <li
                  key={match.id}
                  className={`flex items-center gap-4 px-4 py-3.5 ${
                    i === matches.length - 1 ? "" : "border-b border-line"
                  }`}
                >
                  <div className="w-24 shrink-0">
                    <span
                      className={`flex items-center gap-1.5 font-mono text-[11px] font-bold ${STATUS_STYLES[match.status]}`}
                    >
                      {match.status === "live" ? (
                        <span className="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-whistle" />
                      ) : null}
                      {match.meta}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wide text-floodlight-faint">
                      {match.competition}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold">{match.home}</span>
                      <span className="font-mono text-sm font-bold tabular-nums">{match.homeScore}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold">{match.away}</span>
                      <span className="font-mono text-sm font-bold tabular-nums">{match.awayScore}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] text-floodlight-faint">
            Scores are updated manually by our team, so there may be a short delay.
          </p>
        </section>

        <aside className="lg:sticky lg:top-[84px]">
          <div className="rounded-xl border border-line bg-charcoal p-4">
            <h2 className="mb-3 font-display text-[15px] font-normal uppercase tracking-wide">
              {DEFAULT_COMPETITION} Table
            </h2>
            {standings.length === 0 ? (
              <p className="text-[13px] text-floodlight-dim">The table hasn&apos;t been set up yet.</p>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="border-b border-line px-1 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">#</th>
                    <th className="border-b border-line px-1 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">Team</th>
                    <th className="border-b border-line px-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">P</th>
                    <th className="border-b border-line px-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">GD</th>
                    <th className="border-b border-line px-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => {
                    const border = i === standings.length - 1 ? "" : "border-b border-line";
                    return (
                      <tr key={row.id}>
                        <td className={`px-1 py-2 font-mono ${border} ${row.qualifying ? "text-pitch-bright" : "text-floodlight-faint"}`}>
                          {row.pos}
                        </td>
                        <td className={`px-1 py-2 ${border}`}>{row.team}</td>
                        <td className={`px-1 py-2 text-center font-mono ${border}`}>{row.played}</td>
                        <td className={`px-1 py-2 text-center font-mono ${border}`}>{row.gd}</td>
                        <td className={`px-1 py-2 text-center font-mono font-extrabold ${border}`}>{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </aside>
      </div>
    </PublicPage>
  );
}
