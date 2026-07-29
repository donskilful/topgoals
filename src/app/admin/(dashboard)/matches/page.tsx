import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Match } from "@/lib/models/match";
import { deleteMatch } from "@/lib/actions/matches";
import type { MatchStatus } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DeleteRowForm } from "@/components/admin/delete-row-form";
import { SavedBanner } from "@/components/admin/saved-banner";

const STATUS_BADGES: Record<MatchStatus, string> = {
  live: "bg-[rgba(255,71,87,0.14)] text-whistle",
  finished: "bg-[rgba(34,201,116,0.14)] text-pitch-bright",
  upcoming: "bg-charcoal-3 text-floodlight-dim",
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole();
  const { saved } = await searchParams;
  await dbConnect();

  const matches = await Match.find().sort({ kickoffAt: 1 }).lean();
  const live = matches.filter((m) => m.status === "live").length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Live scores"
        description={
          live > 0
            ? `${live} match${live === 1 ? "" : "es"} marked live — keep the scores and status line current.`
            : "Matches shown in the homepage ticker."
        }
        action={{ label: "Add match", href: "/admin/matches/new" }}
      />

      <SavedBanner show={Boolean(saved)} />

      {matches.length === 0 ? (
        <EmptyState
          message="No matches in the ticker."
          action={{ label: "Add the first match", href: "/admin/matches/new" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                {["Match", "Score", "Status", "Shows as", ""].map((heading) => (
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
              {matches.map((match, i) => {
                const border = i === matches.length - 1 ? "" : "border-b border-line";
                return (
                  <tr key={String(match._id)}>
                    <td className={`px-4 py-3 ${border}`}>
                      <span className="font-semibold">
                        {match.home} v {match.away}
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-floodlight-faint">
                        {match.competition}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono tabular-nums ${border}`}>
                      {match.homeScore}–{match.awayScore}
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_BADGES[match.status]}`}
                      >
                        {match.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono text-[11px] text-floodlight-dim ${border}`}>
                      {match.meta}
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/matches/${String(match._id)}/edit`}
                          className="text-xs font-bold text-pitch-bright hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteRowForm
                          action={deleteMatch}
                          id={String(match._id)}
                          confirmMessage={`Remove ${match.home} v ${match.away} from the ticker?`}
                          label="Remove"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
