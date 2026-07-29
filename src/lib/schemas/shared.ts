import { z } from "zod";

/**
 * A Cloudinary asset as stored on a document. The upload widget writes the JSON
 * into a hidden input, so the raw form value is a string (or empty when no asset
 * has been chosen).
 */
export const mediaSchema = z.object({
  secureUrl: z.string().url(),
  publicId: z.string().min(1),
});

export type Media = z.infer<typeof mediaSchema>;

/** Parses the hidden media input, treating blank/absent as "no asset". */
export const optionalMediaField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (!value || value.trim() === "") return null;

    try {
      const parsed = mediaSchema.safeParse(JSON.parse(value));
      if (!parsed.success) {
        ctx.addIssue({ code: "custom", message: "That upload didn't complete. Try again." });
        return null;
      }
      return parsed.data;
    } catch {
      ctx.addIssue({ code: "custom", message: "That upload didn't complete. Try again." });
      return null;
    }
  });

/** HTML checkboxes submit "on" when ticked and nothing at all when unticked. */
export const checkboxField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

/** `<input type="datetime-local">` submits "2026-07-29T17:30" in local time. */
export const dateTimeField = z
  .string()
  .min(1, "Pick a date and time.")
  .transform((value, ctx) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "That isn't a valid date and time." });
      return new Date();
    }
    return date;
  });

/** Trimmed, non-empty text with a sensible upper bound. */
export function text(label: string, { min = 1, max = 200 }: { min?: number; max?: number } = {}) {
  return z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be under ${max} characters.`);
}

export const objectIdField = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id.");

export const deleteSchema = z.object({ id: objectIdField });

/** Formats a Date for a `datetime-local` input's value attribute. */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
