import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ARTICLE_CATEGORIES } from "@/lib/constants";

const mediaSchema = new Schema(
  {
    secureUrl: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const articleSchema = new Schema(
  {
    category: { type: String, enum: ARTICLE_CATEGORIES, required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    image: { type: mediaSchema, default: null },
    publishedAt: { type: Date, required: true, default: Date.now },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Exactly one article may be featured — it drives the homepage hero.
    featured: { type: Boolean, default: false },
    heroEyebrow: { type: String, trim: true, default: null },
    heroHeadline: { type: String, trim: true, default: null },
    /** Substring of heroHeadline rendered in the gold accent colour. */
    heroHeadlineAccent: { type: String, trim: true, default: null },
    heroDescription: { type: String, trim: true, default: null },
    heroPrimaryCtaLabel: { type: String, trim: true, default: null },
    heroPrimaryCtaHref: { type: String, trim: true, default: null },
    heroSecondaryCtaLabel: { type: String, trim: true, default: null },
    heroSecondaryCtaHref: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

// The DB itself refuses a second featured article, so a racing double-submit
// can't produce two heroes even if application logic slips.
articleSchema.index(
  { featured: 1 },
  { unique: true, partialFilterExpression: { featured: true } },
);
articleSchema.index({ category: 1, publishedAt: -1 });
articleSchema.index({ publishedAt: -1 });

export type ArticleDoc = InferSchemaType<typeof articleSchema>;

export const Article: Model<ArticleDoc> =
  (mongoose.models.Article as Model<ArticleDoc>) ??
  mongoose.model<ArticleDoc>("Article", articleSchema);
