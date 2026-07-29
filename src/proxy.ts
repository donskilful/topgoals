import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

// Only the edge-safe config is imported here — see the note in auth.config.ts.
// (This file is Next 16's replacement for the old `middleware.ts` convention.)
const { auth } = NextAuth(authConfig);

/**
 * Redirects unauthenticated or under-privileged visitors away from /admin, using
 * the `authorized` callback in auth.config.ts. This is a UX convenience only —
 * Server Actions independently enforce roles via requireRole().
 *
 * Declared as an explicit function rather than re-exporting `auth` directly so
 * Next's build-time static analysis can see a function export.
 */
export default function proxy(request: NextRequest) {
  return (auth as unknown as (req: NextRequest) => ReturnType<typeof auth>)(request);
}

export const config = {
  // Scoped to the CMS so public pages never pay the proxy cost.
  matcher: ["/admin/:path*"],
};
