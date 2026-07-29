import type { NextAuthConfig } from "next-auth";
import { isAdminOnlyPath, isStaffRole, type UserRole } from "@/lib/constants";

/**
 * Edge-safe half of the Auth.js config.
 *
 * `middleware.ts` imports ONLY this file. It must never pull in Mongoose or
 * bcrypt (neither runs on the edge runtime) — the Credentials provider and its
 * database lookup live in `auth.ts` instead. Role checks here read the role that
 * was baked into the JWT at sign-in, so middleware never needs a DB round-trip.
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Copy role/id onto the token at sign-in so every later request can authorize
    // from the cookie alone.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (!pathname.startsWith("/admin")) return true;

      // The login page must stay reachable while signed out, or redirecting to it
      // would loop forever.
      if (pathname === "/admin/login") return true;

      const role = auth?.user?.role;
      if (!isStaffRole(role)) return false;

      // Signed-in moderators are sent back to the dashboard rather than the login
      // page — they are authenticated, just not permitted here.
      if (role !== "admin" && isAdminOnlyPath(pathname)) {
        return Response.redirect(new URL("/admin?denied=1", request.nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
