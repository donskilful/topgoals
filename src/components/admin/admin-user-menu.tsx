import Link from "next/link";
import type { UserRole } from "@/lib/constants";
import { logout } from "@/lib/actions/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  moderator: "Moderator",
  user: "User",
};

export function AdminUserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: UserRole;
}) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/"
        target="_blank"
        rel="noreferrer"
        className="hidden text-xs font-semibold text-floodlight-dim hover:text-floodlight sm:inline"
      >
        View site ↗
      </Link>

      <div className="text-right">
        <p className="text-[13px] font-bold leading-tight">{name}</p>
        <p className="font-mono text-[10px] uppercase tracking-wide text-floodlight-faint">
          {ROLE_LABELS[role]}
        </p>
      </div>

      <form action={logout}>
        <button
          type="submit"
          title={`Sign out ${email}`}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-floodlight-dim transition-colors hover:border-floodlight-faint hover:text-floodlight"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
