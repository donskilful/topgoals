import Link from "next/link";
import { getLatestNews } from "@/lib/data/articles";
import { Tag } from "./tag";

export async function LatestNews() {
  const articles = await getLatestNews();

  return (
    <div>
      <div className="mb-[18px] flex items-baseline justify-between">
        <h3 className="font-display text-[26px] font-normal uppercase tracking-wide lg:text-[32px]">
          Latest News
        </h3>
        <Link href="/news" className="text-[13px] font-bold text-pitch-bright hover:underline">
          All news →
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-charcoal p-6 text-center">
          <p className="text-sm text-floodlight-dim">No articles published yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          {articles.map((item) => (
            <Link
              key={item.id}
              href={`/articles/${item.slug}`}
              className="group flex gap-3 rounded-[10px] border border-transparent p-3 transition-colors hover:border-line hover:bg-charcoal"
            >
              <div className="h-[78px] w-[78px] flex-none overflow-hidden rounded-lg border border-line bg-linear-to-br from-charcoal-3 to-charcoal-2">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full transition-transform duration-200 group-hover:scale-105" />
                )}
              </div>
              <div>
                <Tag tag={item.tag} />
                <h4 className="mb-1 mt-1.5 text-sm font-bold leading-snug">{item.title}</h4>
                <p className="text-xs text-floodlight-dim">{item.time}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
