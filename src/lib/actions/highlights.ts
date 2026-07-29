"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Highlight } from "@/lib/models/highlight";
import { logAudit } from "@/lib/audit";
import { destroyAsset } from "@/lib/cloudinary";
import { createHighlightSchema, updateHighlightSchema } from "@/lib/schemas/highlight";
import { deleteSchema } from "@/lib/schemas/shared";
import { revalidateContent } from "@/lib/actions/revalidate";
import { formError, runAction, zodFieldErrors, type FormState } from "@/lib/form-state";

const ADMIN_PATH = "/admin/highlights";

function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    duration: formData.get("duration"),
    publishedAt: formData.get("publishedAt"),
    video: formData.get("video"),
    thumbnail: formData.get("thumbnail"),
  };
}

export async function createHighlight(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = createHighlightSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return formError("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
    }

    await dbConnect();

    const { duration, ...rest } = parsed.data;
    const created = await Highlight.create({ ...rest, durationSeconds: duration });

    await logAudit({
      actor,
      action: "create",
      entityType: "Highlight",
      entityId: String(created._id),
      summary: `Created highlight “${created.title}”`,
      after: created,
    });

    revalidateContent("highlight", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  });
}

export async function updateHighlight(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = updateHighlightSchema.safeParse({
      ...readForm(formData),
      id: formData.get("id"),
    });
    if (!parsed.success) {
      return formError("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
    }

    await dbConnect();

    const { id, duration, ...fields } = parsed.data;
    const before = await Highlight.findById(id).lean();
    if (!before) return formError("That highlight no longer exists.");

    const updated = await Highlight.findByIdAndUpdate(
      id,
      { ...fields, durationSeconds: duration },
      { new: true, runValidators: true },
    ).lean();

    if (before.video?.publicId && before.video.publicId !== fields.video?.publicId) {
      await destroyAsset(before.video.publicId, "video");
    }
    if (before.thumbnail?.publicId && before.thumbnail.publicId !== fields.thumbnail?.publicId) {
      await destroyAsset(before.thumbnail.publicId, "image");
    }

    await logAudit({
      actor,
      action: "update",
      entityType: "Highlight",
      entityId: id,
      summary: `Updated highlight “${updated?.title ?? before.title}”`,
      before,
      after: updated,
    });

    revalidateContent("highlight", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?saved=1`);
  });
}

export async function deleteHighlight(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = deleteSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await Highlight.findById(id).lean();
    if (!before) return formError("That highlight no longer exists.");

    await Highlight.findByIdAndDelete(id);
    await destroyAsset(before.video?.publicId, "video");
    await destroyAsset(before.thumbnail?.publicId, "image");

    await logAudit({
      actor,
      action: "delete",
      entityType: "Highlight",
      entityId: id,
      summary: `Deleted highlight “${before.title}”`,
      before,
    });

    revalidateContent("highlight", ADMIN_PATH);
    return { ok: true, message: `Deleted “${before.title}”.`, fieldErrors: {} };
  });
}
