import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Highlight } from "@/lib/models/highlight";
import { formatDuration } from "@/lib/schemas/highlight";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { HighlightForm } from "../../highlight-form";

export default async function EditHighlightPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const clip = await Highlight.findById(id).lean();
  if (!clip) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edit highlight" description={clip.title} />
      <HighlightForm
        defaultPublishedAt={toDateTimeLocal(clip.publishedAt)}
        highlight={{
          id: String(clip._id),
          title: clip.title,
          duration: formatDuration(clip.durationSeconds),
          publishedAt: toDateTimeLocal(clip.publishedAt),
          video: clip.video ? { secureUrl: clip.video.secureUrl, publicId: clip.video.publicId } : null,
          thumbnail: clip.thumbnail
            ? { secureUrl: clip.thumbnail.secureUrl, publicId: clip.thumbnail.publicId }
            : null,
        }}
      />
    </div>
  );
}
