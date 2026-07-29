import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { requireRole } from "@/lib/auth-helpers";
import { Article } from "@/lib/models/article";
import { Tip } from "@/lib/models/tip";
import { Highlight } from "@/lib/models/highlight";
import { Match } from "@/lib/models/match";
import { AuditLog } from "@/lib/models/audit-log";

const ACTION_COLOURS = {
  create: "text-pitch-bright",
  update: "text-torch",
  delete: "text-whistle",
} as const;

function relativeTime(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const actor = await requireRole();
  const { denied } = await searchParams;
  await dbConnect();

  const [articleCount, pendingTipCount, highlightCount, liveMatchCount, recentActivity] =
    await Promise.all([
      Article.countDocuments(),
      Tip.countDocuments({ result: "pending" }),
      Highlight.countDocuments(),
      Match.countDocuments({ status: "live" }),
      AuditLog.find(actor.role === "admin" ? {} : { actorId: actor.id })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

  const stats = [
    { label: "Articles", value: articleCount, href: "/admin/articles" },
    { label: "Tips pending", value: pendingTipCount, href: "/admin/tips" },
    { label: "Highlights", value: highlightCount, href: "/admin/highlights" },
    { label: "Matches live", value: liveMatchCount, href: "/admin/matches" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl uppercase tracking-wide">
        Welcome back, {actor.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-floodlight-dim">
        Here&apos;s what&apos;s currently live on the site.
      </p>

      {denied ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.1)] px-3 py-2.5 text-[13px] text-torch"
        >
          That area is restricted to administrators. Ask an admin if you need access.
        </p>
      ) : null}

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-line bg-charcoal p-4 transition-colors hover:border-floodlight-faint"
          >
            <p className="font-mono text-3xl font-bold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-floodlight-faint">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-9">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide">
            {actor.role === "admin" ? "Recent activity" : "Your recent activity"}
          </h2>
          <Link href="/admin/activity-log" className="text-xs font-bold text-pitch-bright hover:underline">
            Full log →
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-charcoal">
          {recentActivity.length === 0 ? (
            <p className="p-5 text-sm text-floodlight-dim">
              No activity yet. Changes you make will be recorded here.
            </p>
          ) : (
            <ul>
              {recentActivity.map((entry, i) => (
                <li
                  key={String(entry._id)}
                  className={`flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 ${
                    i === recentActivity.length - 1 ? "" : "border-b border-line"
                  }`}
                >
                  <span className="text-[13px]">
                    <span className={`font-mono text-[11px] uppercase ${ACTION_COLOURS[entry.action]}`}>
                      {entry.action}
                    </span>{" "}
                    {entry.summary}
                  </span>
                  <span className="font-mono text-[11px] text-floodlight-faint">
                    {entry.actorName} · {relativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
