import Link from "next/link";
import { HomeIcon, ClockIcon, TipIcon, NewsIcon, UserIcon } from "./icons";

const TABS = [
  { label: "Home", href: "#", Icon: HomeIcon, active: true },
  { label: "Scores", href: "#", Icon: ClockIcon },
  { label: "Tips", href: "#", Icon: TipIcon },
  { label: "News", href: "#", Icon: NewsIcon },
  { label: "More", href: "#", Icon: UserIcon },
];

export function MobileTabbar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] flex border-t border-line bg-charcoal-2/95 backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)] md:hidden">
      {TABS.map(({ label, href, Icon, active }) => (
        <Link
          key={label}
          href={href}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 pb-2 text-[10px] font-bold uppercase tracking-wide ${
            active ? "text-pitch-bright" : "text-floodlight-faint"
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
