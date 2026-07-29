import type { Metadata } from "next";
import { getHighlights } from "@/lib/data/highlights";
import { EmptyNotice, PageIntro, PublicPage } from "@/components/public-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Goals & Highlights — TopGoals",
  description: "Goal clips and match highlights, posted within minutes of full time.",
};

export default async function HighlightsPage() {
  const clips = await getHighlights(24);

  return (
    <PublicPage>
      <PageIntro
        title="Goals & Highlights"
        description="Clipped within minutes of full time."
      />

      {clips.length === 0 ? (
        <EmptyNotice>No clips published yet.</EmptyNotice>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <article
              key={clip.id}
              className="overflow-hidden rounded-xl border border-line bg-charcoal"
            >
              <div className="relative aspect-16/9 bg-linear-to-br from-charcoal-3 to-charcoal-2">
                {clip.videoUrl ? (
                  <video
                    src={clip.videoUrl}
                    poster={clip.thumbnailUrl ?? undefined}
                    controls
                    preload="none"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-wide text-floodlight-faint">
                    Video coming soon
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="mb-1 font-mono text-[11px] text-torch">{clip.duration}</p>
                <h2 className="text-sm font-bold leading-snug">{clip.title}</h2>
              </div>
            </article>
          ))}
        </div>
      )}
    </PublicPage>
  );
}
