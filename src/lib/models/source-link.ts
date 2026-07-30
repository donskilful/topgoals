import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ARTICLE_CATEGORIES } from "@/lib/constants";

/**
 * A headline from another publisher, shown as a link out.
 *
 * This is the honest answer to automating news without a language model. A feed gives us
 * someone else's prose, and rewriting prose in plain JavaScript means rearranging their
 * words — which is a derivative of their writing however far it drifts, and reads badly
 * besides. So we don't rewrite it at all: we show the headline, name the publisher, and
 * send the reader to them.
 *
 * What is stored is deliberately minimal — headline, publisher, link, timestamp. No
 * summary text, no body. A headline plus attribution plus a link is what every feed is
 * published for, and the reader gets the story from the people who reported it.
 *
 * TopGoals' own written content is the match reports (`src/lib/reports/`), which are
 * generated from match data we licence rather than from anyone's writing.
 */
const sourceLinkSchema = new Schema(
  {
    /** Publisher name, always displayed next to the headline. */
    source: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    category: { type: String, enum: ARTICLE_CATEGORIES, required: true },
    publishedAt: { type: Date, required: true },
    /**
     * Canonical per-story id from the feed, so re-reading a feed updates the row
     * instead of duplicating the headline. See `canonicalStoryId` in feeds/rss.ts.
     */
    guid: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
);

sourceLinkSchema.index({ publishedAt: -1 });
sourceLinkSchema.index({ category: 1, publishedAt: -1 });

export type SourceLinkDoc = InferSchemaType<typeof sourceLinkSchema>;

export const SourceLink: Model<SourceLinkDoc> =
  (mongoose.models.SourceLink as Model<SourceLinkDoc>) ??
  mongoose.model<SourceLinkDoc>("SourceLink", sourceLinkSchema);
