import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TIP_CONFIDENCE_LEVELS, TIP_RESULTS } from "@/lib/constants";

const tipSchema = new Schema(
  {
    competition: { type: String, required: true, trim: true },
    kickoffAt: { type: Date, required: true },
    fixture: { type: String, required: true, trim: true },
    /** The selection itself, e.g. "Over 2.5 Goals". */
    pick: { type: String, required: true, trim: true },
    /** Kept as a string to preserve the exact decimal shown, e.g. "1.85". */
    odds: { type: String, required: true, trim: true },
    confidence: { type: Number, enum: TIP_CONFIDENCE_LEVELS, required: true },
    result: { type: String, enum: TIP_RESULTS, required: true, default: "pending" },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

tipSchema.index({ kickoffAt: -1 });
tipSchema.index({ result: 1, kickoffAt: -1 });

export type TipDoc = InferSchemaType<typeof tipSchema>;

export const Tip: Model<TipDoc> =
  (mongoose.models.Tip as Model<TipDoc>) ??
  mongoose.model<TipDoc>("Tip", tipSchema);
