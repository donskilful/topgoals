import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One execution of an automated job, however it was started.
 *
 * Exists because "when did this last run?" had no answer. The crons wrote to `console.log` and
 * nothing else, so the only way to tell whether the score sync was still alive was to read
 * Vercel's logs — and the CMS, where somebody would actually notice a job had stopped, showed
 * nothing at all. A stalled sync is close to invisible from the outside: the site keeps serving
 * whatever it last stored, so stale data looks exactly like quiet data.
 *
 * Every run is recorded, successful or not, cron or hand-triggered. Failures matter most — a job
 * that has been failing for a day is the case this is meant to surface.
 */
const syncRunSchema = new Schema(
  {
    /** Job key from `src/lib/jobs.ts`. Not an enum: renaming a job shouldn't need a migration. */
    job: { type: String, required: true, index: true },
    ranAt: { type: Date, required: true, default: Date.now },
    /** How it was started — the CMS shows this so a recent manual run isn't mistaken for a healthy cron. */
    trigger: { type: String, enum: ["cron", "manual"], required: true },
    ok: { type: Boolean, required: true },
    /** One line an editor can read: "12 fetched, 3 updated" or the error. */
    summary: { type: String, required: true },
    /** Who pressed the button. Null for cron runs. */
    actorName: { type: String, default: null },
    durationMs: { type: Number, default: null },
  },
  { timestamps: false },
);

// The dashboard's query: the newest run for each job.
syncRunSchema.index({ job: 1, ranAt: -1 });

export type SyncRunDoc = InferSchemaType<typeof syncRunSchema>;

export const SyncRun: Model<SyncRunDoc> =
  (mongoose.models.SyncRun as Model<SyncRunDoc>) ??
  mongoose.model<SyncRunDoc>("SyncRun", syncRunSchema);
