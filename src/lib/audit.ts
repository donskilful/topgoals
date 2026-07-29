import { AuditLog } from "@/lib/models/audit-log";
import type { AuditAction, AuditEntityType } from "@/lib/constants";
import type { SessionActor } from "@/lib/auth-helpers";

/** Fields never worth storing in an audit snapshot (noisy or sensitive). */
const REDACTED_FIELDS = new Set(["passwordHash", "__v"]);

/**
 * Converts a Mongoose document (or lean object) into a plain, JSON-safe snapshot,
 * stripping secrets like password hashes so the audit trail can never leak them.
 */
export function snapshot(doc: unknown): Record<string, unknown> | null {
  if (!doc || typeof doc !== "object") return null;

  const source =
    typeof (doc as { toObject?: () => unknown }).toObject === "function"
      ? ((doc as { toObject: () => unknown }).toObject() as Record<string, unknown>)
      : (doc as Record<string, unknown>);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (REDACTED_FIELDS.has(key)) continue;

    if (value === null || value === undefined) {
      result[key] = null;
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === "object") {
      // ObjectIds, nested subdocuments — store their string/plain form.
      result[key] =
        typeof (value as { toString?: () => string }).toString === "function" &&
        Object.keys(value).length === 0
          ? String(value)
          : JSON.parse(JSON.stringify(value));
    } else {
      result[key] = value;
    }
  }

  return result;
}

type LogAuditInput = {
  actor: SessionActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
};

/**
 * Records who changed what, when. Called by every mutating Server Action.
 *
 * Deliberately never throws: a failed audit write should not roll back or surface
 * over a content change the user already completed. Failures are logged loudly
 * server-side instead.
 */
export async function logAudit({
  actor,
  action,
  entityType,
  entityId,
  summary,
  before,
  after,
}: LogAuditInput): Promise<void> {
  try {
    await AuditLog.create({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action,
      entityType,
      entityId,
      summary,
      before: snapshot(before),
      after: snapshot(after),
    });
  } catch (error) {
    console.error(
      `Failed to write audit log (${action} ${entityType} ${entityId}):`,
      error,
    );
  }
}
