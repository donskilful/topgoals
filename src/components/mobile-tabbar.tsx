"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ClockIcon, TipIcon, NewsIcon, UserIcon } from "./icons";

const TABS = [
  { label: "Home", href: "/", Icon: HomeIcon },
  { label: "Scores", href: "/scores", Icon: ClockIcon },
  { label: "Tips", href: "/tips", Icon: TipIcon },
  { label: "News", href: "/news", Icon: NewsIcon },
  { label: "More", href: "/about", Icon: UserIcon },
];

export function MobileTabbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] flex border-t border-line bg-charcoal-2/95 backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)] md:hidden">
      {TABS.map(({ label, href, Icon }) => {
        // "/" must match exactly or Home would light up on every page.
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 pb-2 text-[10px] font-bold uppercase tracking-wide ${
              active ? "text-pitch-bright" : "text-floodlight-faint"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
