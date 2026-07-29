/**
 * Error types shared between server and client code.
 *
 * Kept dependency-free on purpose: `form-state.ts` is imported by Client
 * Components, so anything it reaches must not pull in Mongoose or Auth.js.
 */

/** Thrown when a caller lacks the role a Server Action requires. */
export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}
