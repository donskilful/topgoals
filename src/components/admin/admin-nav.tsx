"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/constants";

type NavItem = {
  label: string;
  href: string;
  /** Omitted means every staff role may see it. */
  adminOnly?: boolean;
};

const CONTENT_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Articles", href: "/admin/articles" },
  { label: "Betting Tips", href: "/admin/tips" },
  { label: "Highlights", href: "/admin/highlights" },
  { label: "Live Scores", href: "/admin/matches" },
  { label: "Standings", href: "/admin/standings" },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Staff", href: "/admin/users", adminOnly: true },
  { label: "Activity Log", href: "/admin/activity-log" },
];

function isActive(pathname: string, href: string): boolean {
  // /admin must match exactly, or it would light up on every child route.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-charcoal-3 text-floodlight"
          : "text-floodlight-dim hover:bg-charcoal-2 hover:text-floodlight"
      }`}
    >
      {item.label}
    </Link>
  );
}

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const adminItems = ADMIN_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav className="shrink-0 border-b border-line bg-charcoal md:h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex h-16 items-center px-5">
        <Link href="/" className="flex items-baseline gap-0.5 font-display text-xl uppercase tracking-wide">
          <span className="text-torch">Top</span>
          <span className="text-floodlight">Goals</span>
        </Link>
      </div>

      <div className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        <p className="hidden px-3 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[1.5px] text-floodlight-faint md:block">
          Content
        </p>
        {CONTENT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <p className="hidden px-3 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[1.5px] text-floodlight-faint md:block">
          Manage
        </p>
        {adminItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
