"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { UserRole } from "@/lib/constants";

type NavItem = {
  label: string;
  href: string;
  /** Path used for the active check when href carries a query string. */
  match?: string;
  /** Omitted means every staff role may see it. */
  adminOnly?: boolean;
};

const CONTENT_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin" },
  // News and Transfers are the same Article model with different categories, but
  // they're separate sections on the public site, so the CMS mirrors that rather
  // than making people remember the shared model.
  { label: "News", href: "/admin/articles?category=News", match: "/admin/articles" },
  { label: "Transfer News", href: "/admin/articles?category=Transfer", match: "/admin/articles" },
  { label: "Betting Tips", href: "/admin/tips" },
  { label: "Highlights", href: "/admin/highlights" },
  { label: "Live Scores", href: "/admin/matches" },
  { label: "Standings", href: "/admin/standings" },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Messages", href: "/admin/messages" },
  { label: "Staff", href: "/admin/users", adminOnly: true },
  { label: "Activity Log", href: "/admin/activity-log", adminOnly: true },
];

function isActive(pathname: string, category: string | null, item: NavItem): boolean {
  // /admin must match exactly, or it would light up on every child route.
  if (item.href === "/admin") return pathname === "/admin";

  const base = item.match ?? item.href;
  const onSection = pathname === base || pathname.startsWith(`${base}/`);
  if (!onSection) return false;

  // Two nav entries share /admin/articles, so the category decides which is active.
  // Default to News when no category is set (e.g. after an edit redirect).
  const itemCategory = new URLSearchParams(item.href.split("?")[1] ?? "").get("category");
  if (!itemCategory) return true;
  return (category ?? "News") === itemCategory;
}

function NavLink({
  item,
  pathname,
  category,
  badge,
}: {
  item: NavItem;
  pathname: string;
  category: string | null;
  badge?: number;
}) {
  const active = isActive(pathname, category, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-charcoal-3 text-floodlight"
          : "text-floodlight-dim hover:bg-charcoal-2 hover:text-floodlight"
      }`}
    >
      {item.label}
      {badge ? (
        <span className="rounded-full bg-torch px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminNav({ role, unreadMessages = 0 }: { role: UserRole; unreadMessages?: number }) {
  const pathname = usePathname();
  const category = useSearchParams().get("category");
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
          <NavLink key={item.href} item={item} pathname={pathname} category={category} />
        ))}

        <p className="hidden px-3 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[1.5px] text-floodlight-faint md:block">
          Manage
        </p>
        {adminItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            category={category}
            badge={item.href === "/admin/messages" ? unreadMessages : undefined}
          />
        ))}
      </div>
    </nav>
  );
}
