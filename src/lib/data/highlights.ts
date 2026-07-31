import { dbConnect } from "@/lib/db";
import { Highlight } from "@/lib/models/highlight";
import { formatClipLength } from "@/lib/format";
import { videoPosterUrl } from "@/lib/media";
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
      // An uploaded thumbnail wins, but one isn't needed: a frame from the clip itself is
      // derived on the fly, so a highlight is never posterless just because nobody made
      // a separate image for it.
      thumbnailUrl: clip.thumbnail?.secureUrl ?? videoPosterUrl(clip.video?.secureUrl),
    }));
  });
}
