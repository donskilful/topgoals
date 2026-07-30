import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaffRole } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · TopGoals CMS",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth();

  // Already signed in as staff — no reason to show the form again.
  if (isStaffRole(session?.user?.role)) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-baseline gap-0.5 font-display text-2xl uppercase tracking-wide">
            <span className="text-torch">Top</span>
            <span className="text-floodlight">Goals</span>
          </Link>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[1.5px] text-floodlight-faint">
            Content Management
          </p>
        </div>

        <div className="rounded-xl border border-line bg-charcoal p-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-floodlight-faint">
          Staff access only. Accounts are created by an administrator.
        </p>
      </div>
    </main>
  );
}
