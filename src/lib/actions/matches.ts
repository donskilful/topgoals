"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Match } from "@/lib/models/match";
import { logAudit } from "@/lib/audit";
import { createMatchSchema, updateMatchSchema } from "@/lib/schemas/match";
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

const ADMIN_PATH = "/admin/matches";

function readForm(formData: FormData) {
  return {
    competition: formData.get("competition"),
    home: formData.get("home"),
    away: formData.get("away"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    status: formData.get("status"),
    meta: formData.get("meta"),
    kickoffAt: formData.get("kickoffAt"),
  };
}

const describe = (m: { home: string; away: string }) => `${m.home} v ${m.away}`;

export async function createMatch(_prevState: FormState, formData: FormData): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = createMatchSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();
    const created = await Match.create(parsed.data);

    await logAudit({
      actor,
      action: "create",
      entityType: "Match",
      entityId: String(created._id),
      summary: `Added match ${describe(created)}`,
      after: created,
    });

    revalidateContent("match", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  }, formValues(formData));
}

export async function updateMatch(_prevState: FormState, formData: FormData): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = updateMatchSchema.safeParse({ ...readForm(formData), id: formData.get("id") });
    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();

    const { id, ...fields } = parsed.data;
    const before = await Match.findById(id).lean();
    if (!before) return formError("That match no longer exists.");

    const updated = await Match.findByIdAndUpdate(
      id,
      {
        ...fields,
        // A human has now had the last word on this fixture. Flagging it stops the
        // score sync reverting the correction on its next run.
        ...(before.externalId ? { manualOverride: true } : {}),
      },
      { new: true, runValidators: true },
    ).lean();

    const scoreChanged =
      before.homeScore !== fields.homeScore || before.awayScore !== fields.awayScore;

    await logAudit({
      actor,
      action: "update",
      entityType: "Match",
      entityId: id,
      summary:
        (scoreChanged
          ? `Updated score ${describe(fields)} — ${fields.homeScore}-${fields.awayScore} (${fields.meta})`
          : `Updated match ${describe(fields)}`) +
        (before.externalId && !before.manualOverride
          ? " — now excluded from automatic sync"
          : ""),
      before,
      after: updated,
    });

    revalidateContent("match", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  }, formValues(formData));
}

export async function deleteMatch(_prevState: FormState, formData: FormData): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = deleteSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await Match.findById(id).lean();
    if (!before) return formError("That match no longer exists.");

    await Match.findByIdAndDelete(id);

    await logAudit({
      actor,
      action: "delete",
      entityType: "Match",
      entityId: id,
      summary: `Removed match ${describe(before)}`,
      before,
    });

    revalidateContent("match", ADMIN_PATH);
    return formSuccess(`Removed ${describe(before)}.`);
  }, formValues(formData));
}
