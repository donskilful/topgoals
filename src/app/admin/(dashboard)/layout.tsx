import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaffRole } from "@/lib/constants";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";

export const metadata: Metadata = {
  title: "TopGoals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  // The proxy already redirects unauthenticated traffic, but re-check here so a
  // direct render (or a proxy matcher change) can never leak the CMS shell.
  if (!isStaffRole(user?.role)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen md:flex">
      <AdminNav role={user.role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-ink/90 px-5 backdrop-blur-md">
          <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-floodlight-faint">
            Content Management
          </span>
          <AdminUserMenu
            name={user.name ?? user.email ?? "Staff"}
            email={user.email ?? ""}
            role={user.role}
          />
        </header>

        <main className="flex-1 px-5 py-7">{children}</main>
      </div>
    </div>
  );
}
