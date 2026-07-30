import { z } from "zod";
import { checkboxField, objectIdField, text } from "@/lib/schemas/shared";

const wholeNumber = (label: string, max: number) =>
  z.coerce
    .number({ message: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(0, `${label} can't be negative.`)
    .max(max, `${label} looks too high.`);

const standingRowFields = z.object({
  competition: text("Competition", { min: 2, max: 80 }),
  pos: z.coerce
    .number({ message: "Position must be a number." })
    .int("Position must be a whole number.")
    .min(1, "Position starts at 1.")
    .max(30, "Position looks too high."),
  team: text("Team", { min: 2, max: 60 }),
  played: wholeNumber("Played", 60),
  goalsFor: wholeNumber("Goals for", 300),
  goalsAgainst: wholeNumber("Goals against", 300),
  points: wholeNumber("Points", 200),
  qualifying: checkboxField,
});

export const createStandingRowSchema = standingRowFields;
export const updateStandingRowSchema = standingRowFields.extend({ id: objectIdField });

export type StandingRowInput = z.infer<typeof createStandingRowSchema>;
