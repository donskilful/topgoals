"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { StandingRow } from "@/lib/models/standing-row";
import { logAudit } from "@/lib/audit";
import { createStandingRowSchema, updateStandingRowSchema } from "@/lib/schemas/standing-row";
import { deleteSchema } from "@/lib/schemas/shared";
import { revalidateContent } from "@/lib/actions/revalidate";
import { formError, runAction, zodFieldErrors, type FormState } from "@/lib/form-state";

const ADMIN_PATH = "/admin/standings";

function readForm(formData: FormData) {
  return {
    competition: formData.get("competition"),
    pos: formData.get("pos"),
    team: formData.get("team"),
    played: formData.get("played"),
    goalsFor: formData.get("goalsFor"),
    goalsAgainst: formData.get("goalsAgainst"),
    points: formData.get("points"),
    qualifying: formData.get("qualifying"),
  };
}

export async function createStandingRow(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = createStandingRowSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return formError("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
    }

    await dbConnect();
    const created = await StandingRow.create(parsed.data);

    await logAudit({
      actor,
      action: "create",
      entityType: "StandingRow",
      entityId: String(created._id),
      summary: `Added ${created.team} at position ${created.pos} (${created.competition})`,
      after: created,
    });

    revalidateContent("standing", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  });
}

export async function updateStandingRow(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = updateStandingRowSchema.safeParse({
      ...readForm(formData),
      id: formData.get("id"),
    });
    if (!parsed.success) {
      return formError("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
    }

    await dbConnect();

    const { id, ...fields } = parsed.data;
    const before = await StandingRow.findById(id).lean();
    if (!before) return formError("That table row no longer exists.");

    const updated = await StandingRow.findByIdAndUpdate(id, fields, {
      new: true,
      runValidators: true,
    }).lean();

    await logAudit({
      actor,
      action: "update",
      entityType: "StandingRow",
      entityId: id,
      summary: `Updated ${fields.team} — position ${fields.pos}, ${fields.points} pts`,
      before,
      after: updated,
    });

    revalidateContent("standing", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  });
}

export async function deleteStandingRow(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = deleteSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await StandingRow.findById(id).lean();
    if (!before) return formError("That table row no longer exists.");

    await StandingRow.findByIdAndDelete(id);

    await logAudit({
      actor,
      action: "delete",
      entityType: "StandingRow",
      entityId: id,
      summary: `Removed ${before.team} from the ${before.competition} table`,
      before,
    });

    revalidateContent("standing", ADMIN_PATH);
    return { ok: true, message: `Removed ${before.team}.`, fieldErrors: {} };
  });
}
