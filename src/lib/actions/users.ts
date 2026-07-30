"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { logAudit } from "@/lib/audit";
import {
  createUserSchema,
  deleteUserSchema,
  updateUserSchema,
} from "@/lib/schemas/user";
import {
  formError,
  formSuccess,
  formValues,
  runAction,
  zodFieldErrors,
  type FormState,
} from "@/lib/form-state";

const BCRYPT_ROUNDS = 12;

export async function createUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireAdmin();

    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    });

    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();

    const { password, ...rest } = parsed.data;
    const created = await User.create({
      ...rest,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    });

    await logAudit({
      actor,
      action: "create",
      entityType: "User",
      entityId: String(created._id),
      summary: `Created ${created.role} account for ${created.email}`,
      after: created,
    });

    revalidatePath("/admin/users");
    return formSuccess(`Account created for ${created.email}.`);
  }, formValues(formData));
}

export async function updateUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireAdmin();

    const parsed = updateUserSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      password: formData.get("password") ?? "",
    });

    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    await dbConnect();

    const { id, password, ...fields } = parsed.data;
    const before = await User.findById(id).lean();
    if (!before) return formError("That account no longer exists.");

    // Guard against an admin removing their own admin rights and locking
    // themselves — and possibly everyone — out of user management.
    if (String(before._id) === actor.id && fields.role !== "admin") {
      return formError("You cannot change your own role. Ask another admin to do it.", {
        role: "You cannot demote yourself.",
      });
    }

    if (before.role === "admin" && fields.role !== "admin") {
      const remainingAdmins = await User.countDocuments({
        role: "admin",
        _id: { $ne: id },
      });
      if (remainingAdmins === 0) {
        return formError("This is the last admin account — promote someone else first.", {
          role: "At least one admin must remain.",
        });
      }
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        ...fields,
        // Only touch the hash when a new password was actually supplied.
        ...(password ? { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } : {}),
      },
      { new: true, runValidators: true },
    ).lean();

    await logAudit({
      actor,
      action: "update",
      entityType: "User",
      entityId: id,
      summary: `Updated account ${updated?.email ?? id}${password ? " (password reset)" : ""}`,
      before,
      after: updated,
    });

    revalidatePath("/admin/users");
    return formSuccess("Account updated.");
  }, formValues(formData));
}

export async function deleteUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireAdmin();

    const parsed = deleteUserSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await User.findById(id).lean();
    if (!before) return formError("That account no longer exists.");

    if (String(before._id) === actor.id) {
      return formError("You cannot delete your own account.");
    }

    if (before.role === "admin") {
      const remainingAdmins = await User.countDocuments({ role: "admin", _id: { $ne: id } });
      if (remainingAdmins === 0) {
        return formError("This is the last admin account and cannot be deleted.");
      }
    }

    await User.findByIdAndDelete(id);

    await logAudit({
      actor,
      action: "delete",
      entityType: "User",
      entityId: id,
      summary: `Deleted ${before.role} account ${before.email}`,
      before,
    });

    revalidatePath("/admin/users");
    return formSuccess(`Deleted ${before.email}.`);
  }, formValues(formData));
}
