import type { Metadata } from "next";
import { getAllMatches } from "@/lib/data/matches";
import { getAllLeagueTables } from "@/lib/data/standings";
import { LeagueTables } from "@/components/league-tables";
import { SITE_TIMEZONE_LABEL } from "@/lib/constants";
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
  postponed: "text-torch-dim",
} as const;

export default async function ScoresPage() {
  const [matches, tables] = await Promise.all([getAllMatches(60), getAllLeagueTables(20)]);

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
                  } ${match.status === "postponed" ? "opacity-60" : ""}`}
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
            Scores and tables update automatically every few minutes. Corrections made by
            our team always take priority over the feed.
          </p>
        </section>

        <aside className="lg:sticky lg:top-[84px]">
          <LeagueTables tables={tables} />
        </aside>
      </div>
    </PublicPage>
  );
}
