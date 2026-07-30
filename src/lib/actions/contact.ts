"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Message } from "@/lib/models/message";
import { logAudit } from "@/lib/audit";
import { contactSchema, messageIdSchema } from "@/lib/schemas/contact";
import {
  formValues,
  formError,
  formSuccess,
  runAction,
  zodFieldErrors,
  type FormState,
} from "@/lib/form-state";

/**
 * Submits the public contact form.
 *
 * This is the ONE Server Action on the site with no role check — by design, since
 * readers must be able to reach us without an account. That makes its own defences
 * the only ones it has: strict length caps in the schema, a honeypot field, and no
 * reflection of stored input back to other visitors.
 *
 * Not rate-limited yet. That needs shared state (Redis) which isn't in the stack;
 * until then the practical protection is that submissions only ever land in the
 * private CMS inbox, never on a public page.
 */
export async function submitContactMessage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const parsed = contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      topic: formData.get("topic"),
      body: formData.get("body"),
      website: formData.get("website") ?? "",
    });

    if (!parsed.success) {
      return formError(
        "Please fix the highlighted fields.",
        zodFieldErrors(parsed.error),
        formValues(formData),
      );
    }

    // Honeypot tripped: acknowledge as if it worked so bots get no signal, but
    // don't store anything.
    if (parsed.data.website) {
      return formSuccess("Thanks — your message has been sent.");
    }

    await dbConnect();

    // The honeypot is a validation-only field — don't persist it.
    await Message.create({
      name: parsed.data.name,
      email: parsed.data.email,
      topic: parsed.data.topic,
      body: parsed.data.body,
    });

    revalidatePath("/admin/messages");

    return formSuccess(
      "Thanks — your message has been sent. We read everything and reply to anything that needs a reply.",
    );
  }, formValues(formData));
}

/** Staff action: mark a message dealt with (or reopen it). */
export async function toggleMessageHandled(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = messageIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await Message.findById(id).lean();
    if (!before) return formError("That message no longer exists.");

    const handled = !before.handled;
    const updated = await Message.findByIdAndUpdate(
      id,
      {
        handled,
        handledBy: handled ? actor.name : null,
        handledAt: handled ? new Date() : null,
      },
      { new: true },
    ).lean();

    await logAudit({
      actor,
      action: "update",
      entityType: "Message",
      entityId: id,
      summary: `${handled ? "Marked handled" : "Reopened"}: ${before.topic} from ${before.email}`,
      before,
      after: updated,
    });

    revalidatePath("/admin/messages");
    return formSuccess(handled ? "Marked as handled." : "Reopened.");
  }, formValues(formData));
}

export async function deleteMessage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    const parsed = messageIdSchema.safeParse({ id: formData.get("id") });
    if (!parsed.success) return formError("Invalid request.");

    await dbConnect();

    const { id } = parsed.data;
    const before = await Message.findById(id).lean();
    if (!before) return formError("That message no longer exists.");

    await Message.findByIdAndDelete(id);

    await logAudit({
      actor,
      action: "delete",
      entityType: "Message",
      entityId: id,
      summary: `Deleted ${before.topic.toLowerCase()} from ${before.email}`,
      before,
    });

    revalidatePath("/admin/messages");
    return formSuccess("Message deleted.");
  }, formValues(formData));
}
