import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_COMPETITION } from "@/lib/constants";

const standingRowSchema = new Schema(
  {
    competition: { type: String, required: true, default: DEFAULT_COMPETITION, trim: true },
    pos: { type: Number, required: true, min: 1 },
    team: { type: String, required: true, trim: true },
    played: { type: Number, required: true, min: 0 },
    goalsFor: { type: Number, required: true, min: 0 },
    goalsAgainst: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 0 },
    /** Marks a European-qualification position — rendered in green in the table. */
    qualifying: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

/** Goal difference is derived, never stored, so it can't drift from the goal columns. */
standingRowSchema.virtual("goalDifference").get(function () {
  return this.goalsFor - this.goalsAgainst;
});

standingRowSchema.index({ competition: 1, pos: 1 }, { unique: true });

export type StandingRowDoc = InferSchemaType<typeof standingRowSchema>;

export const StandingRow: Model<StandingRowDoc> =
  (mongoose.models.StandingRow as Model<StandingRowDoc>) ??
  mongoose.model<StandingRowDoc>("StandingRow", standingRowSchema);
