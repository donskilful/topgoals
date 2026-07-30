import { dbConnect } from "@/lib/db";
import { Highlight } from "@/lib/models/highlight";
import { formatClipLength } from "@/lib/format";
import { publicRead } from "@/lib/data/public-read";

export type HighlightCard = {
  id: string;
  duration: string;
  title: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
};

export async function getHighlights(limit = 3): Promise<HighlightCard[]> {
  return publicRead("getHighlights", [], async () => {
    await dbConnect();

    const clips = await Highlight.find().sort({ publishedAt: -1 }).limit(limit).lean();

    return clips.map((clip) => ({
      id: String(clip._id),
      duration: formatClipLength(clip.durationSeconds),
      title: clip.title,
      videoUrl: clip.video?.secureUrl ?? null,
      thumbnailUrl: clip.thumbnail?.secureUrl ?? null,
    }));
  });
}
