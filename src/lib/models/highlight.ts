import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const mediaSchema = new Schema(
  {
    secureUrl: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const highlightSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    /** Stored as seconds so it can be formatted as "2:14" at render time. */
    durationSeconds: { type: Number, required: true, min: 0 },
    video: { type: mediaSchema, default: null },
    thumbnail: { type: mediaSchema, default: null },
    publishedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

highlightSchema.index({ publishedAt: -1 });

export type HighlightDoc = InferSchemaType<typeof highlightSchema>;

export const Highlight: Model<HighlightDoc> =
  (mongoose.models.Highlight as Model<HighlightDoc>) ??
  mongoose.model<HighlightDoc>("Highlight", highlightSchema);
