import Link from "next/link";
import { latestNews } from "@/lib/mock-data";
import { Tag } from "./tag";

export function LatestNews() {
  return (
    <div>
      <div className="mb-[18px] flex items-baseline justify-between">
        <h3 className="font-display text-[26px] font-normal uppercase tracking-wide lg:text-[32px]">Latest News</h3>
        <Link href="#" className="text-[13px] font-bold text-pitch-bright hover:underline">
          All news →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        {latestNews.map((item) => (
          <Link
            key={item.id}
            href="#"
            className="group flex gap-3 rounded-[10px] border border-transparent p-3 transition-colors hover:border-line hover:bg-charcoal"
          >
            <div className="h-[78px] w-[78px] flex-none overflow-hidden rounded-lg border border-line bg-linear-to-br from-charcoal-3 to-charcoal-2">
              <div className="h-full w-full transition-transform duration-200 group-hover:scale-105" />
            </div>
            <div>
              <Tag tag={item.tag} />
              <h4 className="mb-1 mt-1.5 text-sm font-bold leading-snug">{item.title}</h4>
              <p className="text-xs text-floodlight-dim">{item.time}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
