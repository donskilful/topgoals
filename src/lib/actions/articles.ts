"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Article } from "@/lib/models/article";
import { logAudit } from "@/lib/audit";
import { destroyAsset } from "@/lib/cloudinary";
import { uniqueSlug } from "@/lib/slug";
import { createArticleSchema, updateArticleSchema } from "@/lib/schemas/article";
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

const ADMIN_PATH = "/admin/articles";

function readForm(formData: FormData) {
  return {
    category: formData.get("category"),
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    publishedAt: formData.get("publishedAt"),
    image: formData.get("image"),
    featured: formData.get("featured"),
    heroEyebrow: formData.get("heroEyebrow"),
    heroHeadline: formData.get("heroHeadline"),
    heroHeadlineAccent: formData.get("heroHeadlineAccent"),
    heroDescription: formData.get("heroDescription"),
    heroPrimaryCtaLabel: formData.get("heroPrimaryCtaLabel"),
    heroPrimaryCtaHref: formData.get("heroPrimaryCtaHref"),
    heroSecondaryCtaLabel: formData.get("heroSecondaryCtaLabel"),
    heroSecondaryCtaHref: formData.get("heroSecondaryCtaHref"),
  };
}

/**
 * Clears the featured flag from any other article.
 *
 * The partial unique index would reject a second featured article outright, so this
 * has to run *before* the new one is saved — the index is the safety net, not the
 * mechanism.
 */
async function unfeatureOthers(exceptId?: string) {
  await Article.updateMany(
    { featured: true, ...(exceptId ? { _id: { $ne: exceptId } } : {}) },
    { $set: { featured: false } },
  );
}

export async function createArticle(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = createArticleSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();

    if (parsed.data.featured) await unfeatureOthers();

    const created = await Article.create({
      ...parsed.data,
      slug: await uniqueSlug(Article, parsed.data.title),
      authorId: actor.id,
    });

    await logAudit({
      actor,
      action: "create",
      entityType: "Article",
      entityId: String(created._id),
      summary: `Created ${created.category.toLowerCase()} article “${created.title}”`,
      after: created,
    });

    revalidateContent("article", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?category=${created.category}&saved=1`);
  }, formValues(formData));
}

export async function updateArticle(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = updateArticleSchema.safeParse({
      ...readForm(formData),
      id: formData.get("id"),
    });
    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();

    const { id, ...fields } = parsed.data;
    const before = await Article.findById(id).lean();
    if (!before) return formError("That article no longer exists.");

    if (fields.featured) await unfeatureOthers(id);

    // Retitling regenerates the slug; keep the old one otherwise so existing links
    // and shares don't break on an unrelated edit.
    const slug =
      fields.title !== before.title ? await uniqueSlug(Article, fields.title, id) : before.slug;

    const updated = await Article.findByIdAndUpdate(
      id,
      { ...fields, slug },
      { new: true, runValidators: true },
    ).lean();

    // Drop the old Cloudinary asset only once the replacement is safely saved.
    if (before.image?.publicId && before.image.publicId !== fields.image?.publicId) {
      await destroyAsset(before.image.publicId, "image");
    }

    await logAudit({
      actor,
      action: "update",
      entityType: "Article",
      entityId: id,
      summary: `Updated article “${updated?.title ?? before.title}”`,
      before,
      after: updated,
    });

    revalidateContent("article", ADMIN_PATH);
    redirect(`${ADMIN_PATH}?category=${fields.category}&saved=1`);
  }, formValues(formData));
}

export async function deleteArticle(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = deleteSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await Article.findById(id).lean();
    if (!before) return formError("That article no longer exists.");

    await Article.findByIdAndDelete(id);
    await destroyAsset(before.image?.publicId, "image");

    await logAudit({
      actor,
      action: "delete",
      entityType: "Article",
      entityId: id,
      summary: `Deleted article “${before.title}”`,
      before,
    });

    revalidateContent("article", ADMIN_PATH);
    return formSuccess(`Deleted “${before.title}”.`);
  }, formValues(formData));
}
