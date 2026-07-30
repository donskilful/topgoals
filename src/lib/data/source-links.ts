import { dbConnect } from "@/lib/db";
import { SourceLink } from "@/lib/models/source-link";
import { relativeTime } from "@/lib/format";
import type { ArticleCategory } from "@/lib/constants";
import { publicRead } from "@/lib/data/public-read";

export type HeadlineLink = {
  id: string;
  source: string;
  title: string;
  url: string;
  tag: ArticleCategory;
  time: string;
};

function toHeadline(link: {
  _id: unknown;
  source: string;
  title: string;
  url: string;
  category: ArticleCategory;
  publishedAt: Date;
}): HeadlineLink {
  return {
    id: String(link._id),
    source: link.source,
    title: link.title,
    url: link.url,
    tag: link.category,
    time: relativeTime(link.publishedAt),
  };
}

/** Recent headlines from other publishers, newest first. */
export async function getHeadlines(
  { category, limit = 10 }: { category?: ArticleCategory; limit?: number } = {},
): Promise<HeadlineLink[]> {
  return publicRead("getHeadlines", [], async () => {
    await dbConnect();

    const links = await SourceLink.find(category ? { category } : {})
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    return links.map(toHeadline);
  });
}
