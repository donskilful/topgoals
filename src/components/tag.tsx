import type { NewsItem } from "@/lib/mock-data";

const TAG_STYLES: Record<NewsItem["tag"], string> = {
  Transfer: "bg-[rgba(245,185,66,0.14)] text-torch",
  News: "bg-[rgba(22,163,94,0.14)] text-pitch-bright",
};

export function Tag({ tag }: { tag: NewsItem["tag"] }) {
  return (
    <span
      className={`inline-block rounded px-[7px] py-[3px] text-[10px] font-extrabold uppercase tracking-wide ${TAG_STYLES[tag]}`}
    >
      {tag}
    </span>
  );
}
