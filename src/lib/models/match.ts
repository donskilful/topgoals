import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { MATCH_STATUSES, NO_SCORE } from "@/lib/constants";

const matchSchema = new Schema(
  {
    competition: { type: String, required: true, trim: true },
    home: { type: String, required: true, trim: true },
    away: { type: String, required: true, trim: true },
    homeScore: { type: String, required: true, default: NO_SCORE, trim: true },
    awayScore: { type: String, required: true, default: NO_SCORE, trim: true },
    status: { type: String, enum: MATCH_STATUSES, required: true },
    /**
     * Free-text status line shown on the card: "76'", "FT", "Today 20:00".
     * Manually maintained — there is no live score feed wired up yet.
     */
    meta: { type: String, required: true, trim: true },
    kickoffAt: { type: Date, required: true },

    /**
     * The provider's fixture id, when this match came from the automated feed.
     * Sparse-unique so repeated syncs update the same row instead of duplicating it,
     * while hand-added matches (no externalId) don't collide with each other.
     */
    externalId: { type: String, default: null },
    lastSyncedAt: { type: Date, default: null },
    /**
     * Set when a human edits a synced match. The sync then leaves it alone — feeds
     * get things wrong, and a corrected score must not be silently overwritten on
     * the next poll.
     */
    manualOverride: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

matchSchema.index({ externalId: 1 }, { unique: true, sparse: true });

matchSchema.index({ kickoffAt: 1 });
matchSchema.index({ status: 1, kickoffAt: 1 });

export type MatchDoc = InferSchemaType<typeof matchSchema>;

export const Match: Model<MatchDoc> =
  (mongoose.models.Match as Model<MatchDoc>) ??
  mongoose.model<MatchDoc>("Match", matchSchema);
