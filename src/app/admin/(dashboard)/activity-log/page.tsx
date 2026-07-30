import { requireAdminOrRedirect } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { AuditLog } from "@/lib/models/audit-log";
import type { AuditAction } from "@/lib/constants";
import { dateTimeFormatter } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/admin/page-header";

const PAGE_SIZE = 50;

const ACTION_BADGES: Record<AuditAction, string> = {
  create: "bg-[rgba(34,201,116,0.14)] text-pitch-bright",
  update: "bg-[rgba(245,185,66,0.14)] text-torch",
  delete: "bg-[rgba(255,71,87,0.14)] text-whistle",
};


export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminOrRedirect();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  await dbConnect();

  // Admin-only page, so no per-actor filtering — this is the whole trail.
  const filter = {};

  const [entries, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Activity log"
        description={`Every content and account change, newest first. ${total} ${total === 1 ? "entry" : "entries"}.`}
      />

      {entries.length === 0 ? (
        <EmptyState message="No activity recorded yet. Changes made in the CMS will appear here." />
      ) : (
        <>
          <ul className="overflow-hidden rounded-xl border border-line bg-charcoal">
            {entries.map((entry, i) => (
              <li
                key={String(entry._id)}
                className={`px-4 py-3 ${i === entries.length - 1 ? "" : "border-b border-line"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${ACTION_BADGES[entry.action]}`}
                  >
                    {entry.action}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-floodlight-faint">
                    {entry.entityType}
                  </span>
                  <span className="text-[13px]">{entry.summary}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-floodlight-faint">
                  {entry.actorName} ({entry.actorEmail}) ·{" "}
                  <time dateTime={entry.createdAt.toISOString()}>
                    {dateTimeFormatter.format(entry.createdAt)}
                  </time>
                </p>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav className="mt-4 flex items-center justify-between text-[13px]">
              {page > 1 ? (
                <a href={`/admin/activity-log?page=${page - 1}`} className="font-bold text-pitch-bright hover:underline">
                  ← Newer
                </a>
              ) : (
                <span />
              )}
              <span className="font-mono text-[11px] text-floodlight-faint">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <a href={`/admin/activity-log?page=${page + 1}`} className="font-bold text-pitch-bright hover:underline">
                  Older →
                </a>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
