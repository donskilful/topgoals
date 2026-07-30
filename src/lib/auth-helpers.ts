import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { STAFF_ROLES, type UserRole } from "@/lib/constants";
import { AuthorizationError } from "@/lib/errors";

export type SessionActor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/**
 * Gate a Server Action or server-rendered page on role, returning the acting user.
 *
 * Middleware already redirects unauthenticated browsers away from /admin, but
 * Server Actions are directly POST-able once their action ID reaches the client
 * bundle — so every action re-checks authorization here rather than trusting the
 * middleware. Also returns the actor, which the audit log needs.
 */
export async function requireRole(
  allowed: readonly UserRole[] = STAFF_ROLES,
): Promise<SessionActor> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.role || !allowed.includes(user.role)) {
    throw new AuthorizationError();
  }

  return {
    id: user.id,
    name: user.name ?? user.email ?? "Unknown",
    email: user.email ?? "",
    role: user.role,
  };
}

/** Convenience wrapper for admin-only operations (user management, full audit log). */
export function requireAdmin(): Promise<SessionActor> {
  return requireRole(["admin"]);
}

/**
 * Page-level equivalent of requireRole: redirects instead of throwing.
 *
 * Throwing is right in a Server Action (the caller turns it into a form error) but
 * wrong in a page render, where an uncaught error surfaces as a generic "server
 * error" screen. The proxy normally redirects first; this is the backstop that
 * runs if the proxy matcher ever stops covering a route.
 */
export async function requireRoleOrRedirect(
  allowed: readonly UserRole[],
  redirectTo = "/admin?denied=1",
): Promise<SessionActor> {
  try {
    return await requireRole(allowed);
  } catch {
    redirect(redirectTo);
  }
}

export function requireAdminOrRedirect(): Promise<SessionActor> {
  return requireRoleOrRedirect(["admin"]);
}
