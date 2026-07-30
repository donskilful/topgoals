import { z } from "zod";
import { dateTimeField, objectIdField, optionalMediaField, text } from "@/lib/schemas/shared";

const highlightFields = z.object({
  title: text("Title", { min: 4, max: 140 }),
  // Entered as mm:ss in the form, stored as seconds so it can be reformatted freely.
  duration: z
    .string()
    .trim()
    .regex(/^\d{1,3}:[0-5]\d$/, "Enter the length as mm:ss, e.g. 2:14.")
    .transform((value) => {
      const [minutes, seconds] = value.split(":").map(Number);
      return minutes * 60 + seconds;
    }),
  publishedAt: dateTimeField,
  video: optionalMediaField,
  thumbnail: optionalMediaField,
});

export const createHighlightSchema = highlightFields;
export const updateHighlightSchema = highlightFields.extend({ id: objectIdField });

export type HighlightInput = z.infer<typeof createHighlightSchema>;

/** Formats stored seconds back into the mm:ss the form expects. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
