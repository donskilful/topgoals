import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Highlight } from "@/lib/models/highlight";
import { deleteHighlight } from "@/lib/actions/highlights";
import { formatDuration } from "@/lib/schemas/highlight";
import { dateTimeFormatter } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DeleteRowForm } from "@/components/admin/delete-row-form";
import { SavedBanner } from "@/components/admin/saved-banner";


export default async function HighlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireRole();
  const { saved } = await searchParams;
  await dbConnect();

  const highlights = await Highlight.find().sort({ publishedAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Goals & highlights"
        description="Video clips shown on the homepage and the highlights page."
        action={{ label: "New highlight", href: "/admin/highlights/new" }}
      />

      <SavedBanner show={Boolean(saved)} />

      {highlights.length === 0 ? (
        <EmptyState
          message="No highlights yet."
          action={{ label: "Add the first clip", href: "/admin/highlights/new" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr>
                {["Title", "Length", "Video", "Published", ""].map((heading) => (
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
              {highlights.map((clip, i) => {
                const border = i === highlights.length - 1 ? "" : "border-b border-line";
                return (
                  <tr key={String(clip._id)}>
                    <td className={`px-4 py-3 font-semibold ${border}`}>{clip.title}</td>
                    <td className={`px-4 py-3 font-mono text-floodlight-dim ${border}`}>
                      {formatDuration(clip.durationSeconds)}
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      {clip.video ? (
                        <span className="text-[11px] font-semibold text-pitch-bright">Uploaded</span>
                      ) : (
                        <span className="text-[11px] text-floodlight-faint">Missing</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 font-mono text-[11px] text-floodlight-dim ${border}`}>
                      {dateTimeFormatter.format(clip.publishedAt)}
                    </td>
                    <td className={`px-4 py-3 ${border}`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/highlights/${String(clip._id)}/edit`}
                          className="text-xs font-bold text-pitch-bright hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteRowForm
                          action={deleteHighlight}
                          id={String(clip._id)}
                          confirmMessage={`Delete "${clip.title}"? The video is removed from Cloudinary too.`}
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
