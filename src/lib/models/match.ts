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
     * Half-time score, when the feed provided one.
     *
     * Stored as numbers rather than the display strings above because the report
     * templates do arithmetic on them. They're the only signal the free tier gives
     * about how a match unfolded — no scorers, no bookings — so a comeback or a
     * second-half collapse is inferred from the gap between these and the full-time
     * score.
     */
    halfTimeHome: { type: Number, default: null },
    halfTimeAway: { type: Number, default: null },
    /** League matchday, for context in generated reports. Null in knockout rounds. */
    matchday: { type: Number, default: null },
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

/**
 * Unique only for matches that actually came from the feed.
 *
 * `sparse` was the obvious choice here and it is the wrong one: a sparse index skips documents
 * where the field is *missing*, but `externalId` defaults to `null`, so every hand-added match
 * stores an explicit null and they all collide with each other. The effect was that the CMS
 * could hold exactly one manually-created fixture — the second save failed with a duplicate key
 * on `externalId: null` — which quietly broke the one workflow that covers the competitions the
 * free tier doesn't carry.
 *
 * A partial index on "is a string" is what was actually meant: feed matches stay de-duplicated
 * across syncs, hand-added ones are ignored by the constraint entirely.
 */
matchSchema.index(
  { externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } },
);

matchSchema.index({ kickoffAt: 1 });
matchSchema.index({ status: 1, kickoffAt: 1 });

export type MatchDoc = InferSchemaType<typeof matchSchema>;

export const Match: Model<MatchDoc> =
  (mongoose.models.Match as Model<MatchDoc>) ??
  mongoose.model<MatchDoc>("Match", matchSchema);
