"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginState = { error: string | null };

/**
 * Signs a staff member in. Returns a generic failure message on bad credentials —
 * never distinguishing "no such account" from "wrong password", which would let an
 * attacker enumerate valid admin emails.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
    return { error: null };
  } catch (error) {
    // signIn throws a redirect on success; Next.js needs that to propagate.
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
