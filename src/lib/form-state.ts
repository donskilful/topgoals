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
};

export const EMPTY_FORM_STATE: FormState = { ok: false, message: null, fieldErrors: {} };

export function formError(message: string, fieldErrors: Record<string, string> = {}): FormState {
  return { ok: false, message, fieldErrors };
}

export function formSuccess(message: string): FormState {
  return { ok: true, message, fieldErrors: {} };
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
export async function runAction(fn: () => Promise<FormState>): Promise<FormState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return formError(error.message);
    }

    // Mongo duplicate key — surface it against the offending field where possible.
    if (isDuplicateKeyError(error)) {
      const field = Object.keys(error.keyPattern ?? {})[0];
      if (field === "email") {
        return formError("That email is already in use.", {
          email: "That email is already in use.",
        });
      }
      if (field === "featured") {
        return formError(
          "Another article is already featured on the homepage. Un-feature it first.",
        );
      }
      if (field) {
        return formError(`That ${field} is already taken.`, { [field]: "Already taken." });
      }
    }

    // Re-throw redirects so Next.js can act on them.
    if (isNextRedirect(error)) throw error;

    console.error("Server action failed:", error);
    return formError("Something went wrong. Please try again.");
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
