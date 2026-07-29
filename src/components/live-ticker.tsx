import Link from "next/link";
import { getTickerMatches } from "@/lib/data/matches";
import type { MatchStatus } from "@/lib/constants";

function MatchMeta({ status, meta }: { status: MatchStatus; meta: string }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-[5px] font-mono text-[11px] font-bold text-whistle">
        <span className="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-whistle" />
        {meta}
      </span>
    );
  }
  if (status === "finished") {
    return <span className="font-mono text-[11px] font-bold text-pitch-bright">{meta}</span>;
  }
  return <span className="font-mono text-[11px] text-floodlight-faint">{meta}</span>;
}

export async function LiveTicker() {
  const matches = await getTickerMatches();

  if (matches.length === 0) return null;

  const anyLive = matches.some((match) => match.status === "live");

  return (
    <section className="border-b border-line bg-[radial-gradient(ellipse_800px_200px_at_20%_-40%,rgba(245,185,66,0.14),transparent_60%),radial-gradient(ellipse_800px_220px_at_80%_-40%,rgba(22,163,94,0.16),transparent_60%),var(--charcoal)] overflow-hidden py-3.5">
      <div className="mx-auto max-w-[1180px] px-5 2xl:max-w-[1320px]">
        <div className="mb-2.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[1.5px] text-floodlight-faint">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-whistle ${anyLive ? "animate-pulse-dot" : ""}`}
          />
          Live &amp; Upcoming
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 bottom-1.5 w-14 bg-linear-to-r from-transparent to-charcoal" />
          <div className="no-scrollbar flex gap-3.5 overflow-x-auto py-0.5 pb-1.5">
            {matches.map((match) => (
              <Link
                key={match.id}
                href="/scores"
                className="block flex-none min-w-[210px] cursor-pointer rounded-[10px] border border-line bg-charcoal-2 px-3.5 py-2.5 transition-all hover:-translate-y-[3px] hover:border-[rgba(245,185,66,0.35)] hover:bg-charcoal-3 lg:min-w-[230px] lg:px-4 lg:py-3"
              >
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-floodlight-faint">
                  {match.competition}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <span className="h-[18px] w-[18px] flex-none rounded border border-line bg-linear-to-br from-charcoal-3 to-charcoal" />
                    {match.home}
                  </div>
                  <div className="font-mono text-sm font-bold tracking-wide tabular-nums">
                    {match.homeScore}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <span className="h-[18px] w-[18px] flex-none rounded border border-line bg-linear-to-br from-charcoal-3 to-charcoal" />
                    {match.away}
                  </div>
                  <div className="font-mono text-sm font-bold tracking-wide tabular-nums">
                    {match.awayScore}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <MatchMeta status={match.status} meta={match.meta} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
