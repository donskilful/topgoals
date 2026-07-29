import Link from "next/link";
import type { NewsCard } from "@/lib/data/articles";
import { Tag } from "./tag";

/** Shared article listing used by /news, /transfers and article "read next" blocks. */
export function ArticleGrid({ articles }: { articles: NewsCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <Link
          key={article.id}
          href={`/articles/${article.slug}`}
          className="group flex flex-col overflow-hidden rounded-xl border border-line bg-charcoal transition-all hover:-translate-y-0.5 hover:border-[rgba(245,185,66,0.3)]"
        >
          <div className="aspect-16/9 overflow-hidden bg-linear-to-br from-charcoal-3 to-charcoal-2">
            {article.imageUrl ? (
              // Cloudinary hostnames would each need allow-listing for next/image;
              // a plain img with lazy loading is the pragmatic choice here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.imageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            ) : null}
          </div>

          <div className="flex flex-1 flex-col p-4">
            <Tag tag={article.tag} />
            <h2 className="mb-2 mt-2 text-[15px] font-bold leading-snug">{article.title}</h2>
            <p className="mb-3 line-clamp-3 text-[13px] leading-relaxed text-floodlight-dim">
              {article.excerpt}
            </p>
            <span className="mt-auto text-[11px] text-floodlight-faint">{article.time}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
