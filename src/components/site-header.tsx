import Link from "next/link";
import { SearchIcon } from "./icons";

const NAV_LINKS = [
  { label: "Scores", href: "#", active: true },
  { label: "Tips", href: "#" },
  { label: "News", href: "#" },
  { label: "Transfers", href: "#" },
  { label: "Highlights", href: "#" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-baseline gap-0.5 font-display text-[22px] uppercase tracking-wide md:text-2xl ${className ?? ""}`}
    >
      <span className="text-torch">Top</span>
      <span className="text-floodlight">Goals</span>
      <span className="ml-2 inline-block h-2 w-2 rounded-full bg-pitch-bright shadow-[0_0_8px_1px_rgba(34,201,116,0.7)]" />
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 2xl:max-w-[1320px]">
        <Logo />

        <nav className="hidden gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`group relative py-1.5 text-sm font-semibold transition-colors ${
                link.active ? "text-floodlight" : "text-floodlight-dim hover:text-floodlight"
              }`}
            >
              {link.label}
              <span
                className={`absolute -bottom-[21px] left-0 right-0 h-0.5 origin-center transition-transform duration-200 ${
                  link.active
                    ? "scale-x-100 bg-pitch-bright"
                    : "scale-x-0 bg-floodlight-dim group-hover:scale-x-100"
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3.5">
          <button
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-charcoal-2 transition-colors hover:border-floodlight-faint hover:bg-charcoal-3"
          >
            <SearchIcon className="text-floodlight" />
          </button>
          <Link
            href="#"
            className="hidden rounded-lg bg-torch px-[18px] py-2.5 text-[13px] font-extrabold text-ink shadow-[0_4px_14px_-4px_rgba(245,185,66,0.5)] transition-all hover:-translate-y-px hover:bg-[#ffc766] md:inline-block"
          >
            Today&apos;s Picks
          </Link>
        </div>
      </div>
    </header>
  );
}
