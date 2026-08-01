import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TIP_CONFIDENCE_LEVELS, TIP_RESULTS } from "@/lib/constants";

const tipSchema = new Schema(
  {
    competition: { type: String, required: true, trim: true },
    kickoffAt: { type: Date, required: true },
    fixture: { type: String, required: true, trim: true },
    /** The selection itself, e.g. "Over 2.5 Goals". */
    pick: { type: String, required: true, trim: true },
    /**
     * Kept as a string to preserve the exact decimal shown, e.g. "1.85".
     *
     * Optional, because scraped providers publish a selection without a price. The alternative
     * was to invent one, and an invented price is not a small lie: profit in units is computed
     * as (odds − 1) per winner, so a made-up 1.85 would show a reader a return that nobody could
     * have achieved. Absent odds are rendered as "—" and excluded from the units figure.
     */
    odds: { type: String, default: null, trim: true },
    /** Optional for the same reason: a provider that states no confidence is given none. */
    confidence: { type: Number, enum: TIP_CONFIDENCE_LEVELS, default: null },
    result: { type: String, enum: TIP_RESULTS, required: true, default: "pending" },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    /**
     * The fixture this tip is on, once known.
     *
     * `fixture` above stays as the display string, but a reference to a real synced match is
     * what makes automatic settlement possible — and what stops the track record depending on
     * somebody remembering to grade every result by hand.
     */
    matchId: { type: Schema.Types.ObjectId, ref: "Match", default: null },

    /** When the result was decided, and by what. */
    settledAt: { type: Date, default: null },
    settledBy: { type: String, enum: ["auto", "manual"], default: null },
    /**
     * Why it settled the way it did — "3 goals at full-time (2-1)" — or why it couldn't.
     * Recorded so a surprising result in the public record can always be traced back to the
     * scoreline that produced it, rather than being taken on trust.
     */
    settlementNote: { type: String, default: null },

    /**
     * Where the selection came from, when it wasn't ours.
     *
     * Stored for every ingested tip so each provider builds a verified record on our own
     * settled results, instead of us relying on the win rate they advertise. Null on tips
     * written in the CMS.
     */
    source: {
      type: new Schema(
        { name: { type: String, required: true }, url: { type: String, default: null } },
        { _id: false },
      ),
      default: null,
    },

    /**
     * Whether this tip is shown to readers.
     *
     * Tips written in the CMS are published — a human decided to post them. Ingested tips are
     * not, until the provider they came from has built a verified record on results we settled
     * ourselves (see `src/lib/data/providers.ts`).
     *
     * This is what makes scraping defensible. A provider's advertised strike rate is marketing,
     * and nothing on the pages we read carries a probability figure at all, so there is no way
     * to filter for "high confidence" at the moment of ingestion. The only trustworthy filter is
     * time: track every pick, settle it against the real scoreline, and let a provider earn its
     * way onto the site. The consequence is deliberate — a newly added provider publishes
     * nothing for its first couple of weeks while its record accumulates.
     */
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

tipSchema.index({ kickoffAt: -1 });
tipSchema.index({ result: 1, kickoffAt: -1 });
// Every public read is filtered to published tips.
tipSchema.index({ published: 1, result: 1, kickoffAt: -1 });
// Ingestion's duplicate check: has this provider already given us this pick on this fixture?
tipSchema.index({ "source.name": 1, matchId: 1 });
// The settlement job's query: unsettled tips whose fixture has had time to finish.
tipSchema.index({ result: 1, matchId: 1 });
// Per-provider record aggregation.
tipSchema.index({ "source.name": 1, result: 1 });

export type TipDoc = InferSchemaType<typeof tipSchema>;

export const Tip: Model<TipDoc> =
  (mongoose.models.Tip as Model<TipDoc>) ??
  mongoose.model<TipDoc>("Tip", tipSchema);
