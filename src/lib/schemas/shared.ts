import { z } from "zod";
import { SITE_TIMEZONE, SITE_UTC_OFFSET } from "@/lib/constants";

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

/**
 * `<input type="datetime-local">` submits a bare "2026-07-29T20:00" with no zone.
 *
 * `new Date()` would read that in the *server's* timezone, so the same entry would
 * store a different instant on a Lagos laptop than on a US datacentre. The site's
 * offset is appended explicitly so an editor typing 20:00 always means 20:00 GMT+1.
 */
export const dateTimeField = z
  .string()
  .min(1, "Pick a date and time.")
  .transform((value, ctx) => {
    const date = new Date(`${value}:00${SITE_UTC_OFFSET}`);
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

/**
 * Formats a Date for a `datetime-local` input, in the site's timezone.
 *
 * Must mirror dateTimeField's parsing exactly — reading a stored time back in a
 * different zone than it was written in would make times drift a little further
 * every time someone opened and re-saved a record.
 */
export function toDateTimeLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  // en-CA gives zero-padded ISO-ordered parts; hourCycle can yield "24" at midnight.
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
