import { z } from "zod";
import { AuthorizationError } from "@/lib/errors";

/**
 * Shared return shape for every CRUD Server Action, so form components can render
 * errors the same way regardless of which entity they're editing.
 */
export type FormState = {
  ok: boolean;
  /** Message shown at the top of the form (validation summary or failure reason). */
  message: string | null;
  /** Per-field messages, keyed by input name. */
  fieldErrors: Record<string, string>;
  /**
   * What the user submitted, echoed back so the form can repopulate itself.
   *
   * React resets uncontrolled inputs once a form action completes, so without this
   * a validation error would wipe everything typed — losing a long article to a
   * single missing field. Forms read these in preference to their own defaults.
   */
  values: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = {
  ok: false,
  message: null,
  fieldErrors: {},
  values: {},
};

export function formError(
  message: string,
  fieldErrors: Record<string, string> = {},
  values: Record<string, string> = {},
): FormState {
  return { ok: false, message, fieldErrors, values };
}

export function formSuccess(message: string): FormState {
  return { ok: true, message, fieldErrors: {}, values: {} };
}

/** Fields never echoed back to the browser, even to help the user retry. */
const NEVER_ECHOED = new Set(["password", "passwordHash", "website"]);

/**
 * Snapshots a submitted form so a failed action can repopulate the inputs.
 * Passwords are deliberately dropped rather than round-tripped.
 */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (NEVER_ECHOED.has(key)) continue;
    if (typeof value === "string") values[key] = value;
  }

  return values;
}

/** Flattens a Zod error into per-field messages for FormState. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".");
    // Keep the first message per field — showing three at once is noise.
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return fieldErrors;
}

/**
 * Wraps a Server Action body so authorization failures, duplicate-key errors and
 * unexpected exceptions all become a FormState instead of an unhandled rejection.
 */
export async function runAction(
  fn: () => Promise<FormState>,
  /** Submitted values, so unexpected failures still preserve what was typed. */
  values: Record<string, string> = {},
): Promise<FormState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return formError(error.message, {}, values);
    }

    // Mongo duplicate key — surface it against the field that actually clashed.
    if (isDuplicateKeyError(error)) {
      const fields = Object.keys(error.keyPattern ?? {});

      if (fields.includes("email")) {
        return formError(
          "That email is already in use.",
          { email: "That email is already in use." },
          values,
        );
      }

      if (fields.includes("featured")) {
        return formError(
          "Another article is already featured on the homepage. Un-feature it first.",
          {},
          values,
        );
      }

      // Compound {competition, pos} index: the competition is fine, the position
      // within it is taken — blaming "competition" would send people to the wrong field.
      if (fields.includes("pos")) {
        return formError(
          "Another team already occupies that position in this table. Change the position, or edit the team that's there.",
          { pos: "Position already used." },
          values,
        );
      }

      if (fields.includes("slug")) {
        return formError(
          "An article with a very similar headline already exists. Adjust the headline slightly.",
          { title: "Too similar to an existing headline." },
          values,
        );
      }

      const field = fields[0];
      if (field) {
        return formError(`That ${field} is already taken.`, { [field]: "Already taken." }, values);
      }
    }

    // Re-throw redirects so Next.js can act on them.
    if (isNextRedirect(error)) throw error;

    console.error("Server action failed:", error);
    return formError("Something went wrong. Please try again.", {}, values);
  }
}

type DuplicateKeyError = { code: number; keyPattern?: Record<string, unknown> };

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
