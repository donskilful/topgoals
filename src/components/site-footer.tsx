import Link from "next/link";
import { Logo } from "./site-header";

const FOOTER_LINKS = ["About", "Contact", "Privacy", "Telegram"];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-dashed border-line py-8 pb-10 text-xs text-floodlight-faint">
      <div className="mx-auto max-w-[1180px] px-5 2xl:max-w-[1320px]">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-5">
          <Logo />
          <div className="flex flex-wrap gap-[18px]">
            {FOOTER_LINKS.map((link) => (
              <Link key={link} href="#" className="hover:text-floodlight-dim">
                {link}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-charcoal px-3.5 py-3 text-[11.5px] leading-relaxed">
          <b className="text-whistle">18+</b> Betting tips are for informational purposes only and do not guarantee
          results. Please gamble responsibly.
        </div>
      </div>
    </footer>
  );
}
