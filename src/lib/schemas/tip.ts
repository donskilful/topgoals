import { z } from "zod";
import { TIP_RESULTS, type TipConfidence } from "@/lib/constants";
import { dateTimeField, objectIdField, text } from "@/lib/schemas/shared";

const tipFields = z.object({
  competition: text("Competition", { min: 2, max: 80 }),
  fixture: text("Fixture", { min: 4, max: 120 }),
  pick: text("Selection", { min: 2, max: 100 }),
  // Kept as a string so "1.80" doesn't display as "1.8", but validated as a number
  // above evens — decimal odds below 1.01 aren't a real market.
  odds: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter odds as a decimal, e.g. 1.85.")
    .refine((value) => Number(value) >= 1.01, "Odds must be at least 1.01.")
    .refine((value) => Number(value) <= 1000, "Odds look too high."),
  // Narrowed to the literal union the model's enum expects, so a stray number
  // can't reach the database.
  confidence: z.coerce
    .number()
    .int()
    .min(1, "Choose a confidence level.")
    .max(4, "Choose a confidence level.")
    .transform((value) => value as TipConfidence),
  kickoffAt: dateTimeField,
  result: z.enum(TIP_RESULTS, { message: "Choose a result." }),
});

export const createTipSchema = tipFields;
export const updateTipSchema = tipFields.extend({ id: objectIdField });

export type TipInput = z.infer<typeof createTipSchema>;
