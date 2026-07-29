import { z } from "zod";
import { MESSAGE_TOPICS } from "@/lib/constants";
import { objectIdField } from "@/lib/schemas/shared";

/**
 * Public-facing, so the limits are deliberately tight: this is the only schema on
 * the site that anyone on the internet can submit against.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(80, "That name is too long."),
  email: z.string().trim().toLowerCase().email("Enter an email we can reply to."),
  topic: z.enum(MESSAGE_TOPICS, { message: "Pick what this is about." }),
  body: z
    .string()
    .trim()
    .min(20, "Please give us a bit more detail — at least 20 characters.")
    .max(4000, "That message is too long. Keep it under 4000 characters."),
  /**
   * Honeypot. Hidden from real users by CSS, so anything filled in here came from a
   * bot blindly completing every input. Submissions with a value are dropped.
   */
  website: z.string().max(0).optional().or(z.literal("")),
});

export const messageIdSchema = z.object({ id: objectIdField });

export type ContactInput = z.infer<typeof contactSchema>;
