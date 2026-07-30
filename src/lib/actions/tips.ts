"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";
import { logAudit } from "@/lib/audit";
import { createTipSchema, updateTipSchema } from "@/lib/schemas/tip";
import { deleteSchema } from "@/lib/schemas/shared";
import { revalidateContent } from "@/lib/actions/revalidate";
import {
  formError,
  formSuccess,
  formValues,
  runAction,
  zodFieldErrors,
  type FormState,
} from "@/lib/form-state";

const ADMIN_PATH = "/admin/tips";

function readForm(formData: FormData) {
  return {
    competition: formData.get("competition"),
    fixture: formData.get("fixture"),
    pick: formData.get("pick"),
    odds: formData.get("odds"),
    confidence: formData.get("confidence"),
    kickoffAt: formData.get("kickoffAt"),
    result: formData.get("result"),
  };
}

export async function createTip(_prevState: FormState, formData: FormData): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = createTipSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();

    const created = await Tip.create({ ...parsed.data, authorId: actor.id });

    await logAudit({
      actor,
      action: "create",
      entityType: "Tip",
      entityId: String(created._id),
      summary: `Created tip ${created.fixture} — ${created.pick} @ ${created.odds}`,
      after: created,
    });

    revalidateContent("tip", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  }, formValues(formData));
}

export async function updateTip(_prevState: FormState, formData: FormData): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = updateTipSchema.safeParse({ ...readForm(formData), id: formData.get("id") });
    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();

    const { id, ...fields } = parsed.data;
    const before = await Tip.findById(id).lean();
    if (!before) return formError("That tip no longer exists.");

    const updated = await Tip.findByIdAndUpdate(id, fields, {
      new: true,
      runValidators: true,
    }).lean();

    // Settling a tip changes the published win rate, so call it out in the log.
    const settled =
      before.result === "pending" && fields.result !== "pending"
        ? ` — settled as ${fields.result}`
        : "";

    await logAudit({
      actor,
      action: "update",
      entityType: "Tip",
      entityId: id,
      summary: `Updated tip ${fields.fixture}${settled}`,
      before,
      after: updated,
    });

    revalidateContent("tip", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  }, formValues(formData));
}

export async function deleteTip(_prevState: FormState, formData: FormData): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = deleteSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await Tip.findById(id).lean();
    if (!before) return formError("That tip no longer exists.");

    await Tip.findByIdAndDelete(id);

    await logAudit({
      actor,
      action: "delete",
      entityType: "Tip",
      entityId: id,
      summary: `Deleted tip ${before.fixture} — ${before.pick}`,
      before,
    });

    revalidateContent("tip", ADMIN_PATH);
    return formSuccess(`Deleted the ${before.fixture} tip.`);
  }, formValues(formData));
}
