import Link from "next/link";
import { getHeadlines } from "@/lib/data/source-links";
import { Tag } from "./tag";
import type { ArticleCategory } from "@/lib/constants";

/**
 * Headlines from other football publishers, linking out to them.
 *
 * This is also where transfer coverage lives. Nothing generates transfer *articles* — a
 * transfer story only exists as another publisher's prose, and rewriting prose without a
 * language model means rearranging their words — so the honest form is to surface the
 * headline, name who reported it, and send the reader there.
 *
 * Deliberately looks like what it is. Each row names the publisher, carries an external
 * link marker, and opens in a new tab, so a reader can't mistake one of these for
 * TopGoals' own reporting.
 */
export async function AroundTheWeb({
  category,
  limit = 8,
  className = "",
  /**
   * Optional "view more" destinations shown under the list. Passed on the homepage, where
   * this is a teaser; omitted on /news and /transfers, which *are* the fuller view.
   */
  moreLinks,
}: {
  category?: ArticleCategory;
  limit?: number;
  className?: string;
  moreLinks?: { label: string; href: string }[];
}) {
  const headlines = await getHeadlines({ category, limit });

  if (headlines.length === 0) return null;

  return (
    <section className={className}>
      {/*
        Stacked rather than title-and-caption on one row. Side by side, the caption stole
        enough width on a phone to wrap "Around the Web" onto two lines — and the display
        face is large enough that a wrapped heading dominated the screen.
      */}
      <div className="mb-[18px]">
        <h3 className="font-display text-[26px] font-normal uppercase leading-none tracking-wide lg:text-[32px]">
          Around the Web
        </h3>
        <p className="mt-1.5 text-[12px] italic text-floodlight-faint">
          Links open at the source
        </p>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-charcoal">
        {headlines.map((headline) => (
          <li key={headline.id}>
            <a
              href={headline.url}
              target="_blank"
              // nofollow on outbound aggregated links, and noopener/noreferrer because
              // these are third-party pages opened in a new tab.
              rel="noopener noreferrer nofollow"
              className="group flex items-start gap-3 p-3.5 transition-colors hover:bg-charcoal-2"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Tag tag={headline.tag} />
                  <span className="font-mono text-[10px] uppercase tracking-wide text-floodlight-faint">
                    {headline.source}
                  </span>
                </div>
                <p className="text-[14px] font-semibold leading-snug text-floodlight group-hover:text-torch">
                  {headline.title}
                </p>
                <span className="mt-1 block text-[11px] text-floodlight-faint">
                  {headline.time}
                </span>
              </div>
              <span
                aria-hidden="true"
                className="mt-0.5 flex-none text-[13px] text-floodlight-faint transition-colors group-hover:text-torch"
              >
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>

      {moreLinks && moreLinks.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {moreLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-line px-3 py-2 text-[12px] font-bold text-floodlight-dim transition-colors hover:border-floodlight-faint hover:bg-charcoal-2 hover:text-floodlight"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
