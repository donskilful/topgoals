import { getHeadlines } from "@/lib/data/source-links";
import { Tag } from "./tag";
import type { ArticleCategory } from "@/lib/constants";

/**
 * Headlines from other football publishers, linking out to them.
 *
 * Deliberately looks like what it is. Each row names the publisher, carries an external
 * link marker, and opens in a new tab — a reader should never be able to mistake one of
 * these for TopGoals' own reporting. That honesty is the point: we didn't write these,
 * so we send the reader to whoever did.
 */
export async function AroundTheWeb({
  category,
  limit = 8,
  className = "",
}: {
  category?: ArticleCategory;
  limit?: number;
  className?: string;
}) {
  const headlines = await getHeadlines({ category, limit });

  if (headlines.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-[18px] flex items-baseline justify-between">
        <h3 className="font-display text-[26px] font-normal uppercase tracking-wide lg:text-[32px]">
          Around the Web
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-wide text-floodlight-faint">
          Links open at the source
        </span>
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
                <div className="mb-1.5 flex items-center gap-2">
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
    </section>
  );
}
