import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { StandingRow } from "@/lib/models/standing-row";
import { deleteStandingRow } from "@/lib/actions/standings";
import { formatGoalDifference } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DeleteRowForm } from "@/components/admin/delete-row-form";
import { SavedBanner } from "@/components/admin/saved-banner";

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole();
  const { saved } = await searchParams;
  await dbConnect();

  const rows = await StandingRow.find().sort({ competition: 1, pos: 1 }).lean();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Standings"
        description="The league table shown in the homepage sidebar."
        action={{ label: "Add team", href: "/admin/standings/new" }}
      />

      <SavedBanner show={Boolean(saved)} />

      {rows.length === 0 ? (
        <EmptyState
          message="The table is empty."
          action={{ label: "Add the first team", href: "/admin/standings/new" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr>
                {["#", "Team", "P", "GF", "GA", "GD", "Pts", ""].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-line px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const border = i === rows.length - 1 ? "" : "border-b border-line";
                return (
                  <tr key={String(row._id)}>
                    <td
                      className={`px-3 py-3 font-mono ${border} ${row.qualifying ? "text-pitch-bright" : "text-floodlight-faint"}`}
                    >
                      {row.pos}
                    </td>
                    <td className={`px-3 py-3 font-semibold ${border}`}>{row.team}</td>
                    <td className={`px-3 py-3 font-mono text-floodlight-dim ${border}`}>{row.played}</td>
                    <td className={`px-3 py-3 font-mono text-floodlight-dim ${border}`}>{row.goalsFor}</td>
                    <td className={`px-3 py-3 font-mono text-floodlight-dim ${border}`}>{row.goalsAgainst}</td>
                    <td className={`px-3 py-3 font-mono text-floodlight-dim ${border}`}>
                      {formatGoalDifference(row.goalsFor, row.goalsAgainst)}
                    </td>
                    <td className={`px-3 py-3 font-mono font-extrabold ${border}`}>{row.points}</td>
                    <td className={`px-3 py-3 ${border}`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/standings/${String(row._id)}/edit`}
                          className="text-xs font-bold text-pitch-bright hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteRowForm
                          action={deleteStandingRow}
                          id={String(row._id)}
                          confirmMessage={`Remove ${row.team} from the table?`}
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
