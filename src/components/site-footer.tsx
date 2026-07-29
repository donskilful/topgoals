import Link from "next/link";
import { Logo } from "./site-header";

const FOOTER_SECTIONS = [
  {
    heading: "Football",
    links: [
      { label: "Live Scores", href: "/scores" },
      { label: "Betting Tips", href: "/tips" },
      { label: "Highlights", href: "/highlights" },
    ],
  },
  {
    heading: "Reading",
    links: [
      { label: "Latest News", href: "/news" },
      { label: "Transfers", href: "/transfers" },
    ],
  },
  {
    heading: "TopGoals",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Responsible Gambling", href: "/privacy#responsible-gambling" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-dashed border-line py-8 pb-10 text-xs text-floodlight-faint">
      <div className="mx-auto max-w-[1180px] px-5 2xl:max-w-[1320px]">
        <div className="mb-7 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo />
            <p className="mt-3 max-w-[220px] leading-relaxed">
              Football scores, daily tips and news — built to load fast wherever you are.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h3 className="mb-2.5 font-mono text-[10px] uppercase tracking-[1.5px] text-floodlight-dim">
                {section.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-floodlight-dim">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-line bg-charcoal px-3.5 py-3 text-[11.5px] leading-relaxed">
          <b className="text-whistle">18+</b> Betting tips are opinion and analysis, not
          guarantees. Past results never predict future outcomes. Only stake what you can
          afford to lose, and if gambling stops being fun, take a break — free, confidential
          help is available at{" "}
          <a
            href="https://www.begambleaware.org"
            target="_blank"
            rel="noreferrer noopener"
            className="text-floodlight-dim underline hover:text-floodlight"
          >
            BeGambleAware.org
          </a>
          .
        </div>

        <p className="mt-4 text-center text-[11px]">
          © {new Date().getFullYear()} TopGoals. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
