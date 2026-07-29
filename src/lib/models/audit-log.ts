import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/constants";

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Snapshotted so the log stays readable even if the account is later deleted. */
    actorName: { type: String, required: true },
    actorEmail: { type: String, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entityType: { type: String, enum: AUDIT_ENTITY_TYPES, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    /** Human-readable one-liner, e.g. 'Created article "Mbappé completes move"'. */
    summary: { type: String, required: true },
    /**
     * Full pre/post document snapshots. Storing whole documents (not just changed
     * fields) is what makes a future diff or undo view possible, and on delete the
     * `before` snapshot is the only remaining record of what existed.
     */
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
  },
  // Audit entries are immutable: created once, never edited, so updatedAt is noise.
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;

export const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) ??
  mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema);
