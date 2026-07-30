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

    /**
     * Recent results, newest first: ["W","D","L",…]. Provided by the feed.
     * Empty for hand-entered rows.
     */
    form: { type: [String], default: [] },

    /** Set when the row came from the provider rather than being typed into the CMS. */
    autoSynced: { type: Boolean, required: true, default: false },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** Goal difference is derived, never stored, so it can't drift from the goal columns. */
standingRowSchema.virtual("goalDifference").get(function () {
  return this.goalsFor - this.goalsAgainst;
});

/**
 * A team appears once per table — that's the real invariant, and it's what the sync
 * matches on.
 *
 * Position deliberately isn't part of the unique key. It used to be
 * (`{competition, pos}` unique), which looked equivalent and wasn't: positions reshuffle
 * on almost every sync, so updating row by row hit duplicate-key errors the moment two
 * teams swapped places. Re-ordering a table by hand in the CMS hit the same wall.
 */
standingRowSchema.index({ competition: 1, team: 1 }, { unique: true });

/** Plain (non-unique) — this is a sort key, not an identity. */
standingRowSchema.index({ competition: 1, pos: 1 });

export type StandingRowDoc = InferSchemaType<typeof standingRowSchema>;

export const StandingRow: Model<StandingRowDoc> =
  (mongoose.models.StandingRow as Model<StandingRowDoc>) ??
  mongoose.model<StandingRowDoc>("StandingRow", standingRowSchema);
