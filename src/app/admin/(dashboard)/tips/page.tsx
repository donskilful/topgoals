import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";
import { deleteTip } from "@/lib/actions/tips";
import { dateTimeFormatter } from "@/lib/format";
import type { TipResultStatus } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DeleteRowForm } from "@/components/admin/delete-row-form";
import { SavedBanner } from "@/components/admin/saved-banner";

const RESULT_BADGES: Record<TipResultStatus, string> = {
  pending: "bg-charcoal-3 text-floodlight-dim",
  won: "bg-[rgba(34,201,116,0.14)] text-pitch-bright",
  lost: "bg-[rgba(255,71,87,0.14)] text-whistle",
  void: "bg-charcoal-3 text-floodlight-faint",
};


export default async function TipsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole();
  const { saved } = await searchParams;
  await dbConnect();

  const tips = await Tip.find().sort({ kickoffAt: -1 }).lean();
  const pending = tips.filter((tip) => tip.result === "pending").length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Betting tips"
        description={
          pending > 0
            ? `${pending} tip${pending === 1 ? "" : "s"} still waiting to be settled.`
            : "All tips are settled."
        }
        action={{ label: "New tip", href: "/admin/tips/new" }}
      />

      <SavedBanner show={Boolean(saved)} />

      {tips.length === 0 ? (
        <EmptyState
          message="No tips yet."
          action={{ label: "Add the first tip", href: "/admin/tips/new" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                {["Fixture", "Selection", "Odds", "Kick-off", "Result", ""].map((heading) => (
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
              {tips.map((tip, i) => {
                const border = i === tips.length - 1 ? "" : "border-b border-line";
                return (
                  <tr key={String(tip._id)}>
                    <td className={`px-4 py-3 ${border}`}>
                      <span className="font-semibold">{tip.fixture}</span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-floodlight-faint">
                        {tip.competition}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-floodlight-dim ${border}`}>{tip.pick}</td>
                    <td className={`px-4 py-3 font-mono ${border}`}>{tip.odds}</td>
                    <td className={`px-4 py-3 font-mono text-[11px] text-floodlight-dim ${border}`}>
                      {dateTimeFormatter.format(tip.kickoffAt)}
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${RESULT_BADGES[tip.result]}`}
                      >
                        {tip.result}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/tips/${String(tip._id)}/edit`}
                          className="text-xs font-bold text-pitch-bright hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteRowForm
                          action={deleteTip}
                          id={String(tip._id)}
                          confirmMessage={`Delete the ${tip.fixture} tip? This cannot be undone.`}
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
