import { z } from "zod";
import { MATCH_STATUSES, NO_SCORE } from "@/lib/constants";
import { dateTimeField, objectIdField, text } from "@/lib/schemas/shared";

/** A score is either a number or the en-dash placeholder used before kickoff. */
const scoreField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? NO_SCORE : trimmed;
  })
  .refine((value) => value === NO_SCORE || /^\d{1,2}$/.test(value), {
    message: "Enter a score as a number, or leave it blank before kickoff.",
  });

const matchFields = z.object({
  competition: text("Competition", { min: 2, max: 80 }),
  home: text("Home team", { min: 2, max: 60 }),
  away: text("Away team", { min: 2, max: 60 }),
  homeScore: scoreField,
  awayScore: scoreField,
  status: z.enum(MATCH_STATUSES, { message: "Choose a status." }),
  // Free text because there's no live feed yet: the site owner types "76'", "HT",
  // "FT" or a kickoff time by hand. See the README's known limitations.
  meta: text("Status line", { min: 1, max: 40 }),
  kickoffAt: dateTimeField,
});

export const createMatchSchema = matchFields;
export const updateMatchSchema = matchFields.extend({ id: objectIdField });

export type MatchInput = z.infer<typeof createMatchSchema>;
