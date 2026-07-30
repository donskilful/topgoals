import Link from "next/link";
import { getFeaturedArticle, getHeroSideStories } from "@/lib/data/articles";
import { ArticleArtwork } from "./article-artwork";
import { HeroGhost } from "./hero-ghost";
import { HeroFigure } from "./hero-figure";
import { Tag } from "./tag";

/**
 * Splits the headline around the accent phrase so it can be highlighted in gold.
 * The accent is validated on save to be a substring, but this stays tolerant in
 * case the data was edited outside the CMS.
 */
function renderHeadline(headline: string, accent: string | null) {
  if (!accent) return headline;

  const index = headline.toLowerCase().indexOf(accent.toLowerCase());
  if (index === -1) return headline;

  return (
    <>
      {headline.slice(0, index)}
      <span className="text-torch">{headline.slice(index, index + accent.length)}</span>
      {headline.slice(index + accent.length)}
    </>
  );
}

export async function Hero() {
  const [hero, sideStories] = await Promise.all([getFeaturedArticle(), getHeroSideStories()]);

  // Nothing featured yet — the ticker below still leads the page, so skip the hero
  // rather than rendering an empty band.
  if (!hero) return null;

  return (
    <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(1100px_520px_at_18%_-20%,rgba(245,185,66,0.10),transparent_55%),radial-gradient(900px_460px_at_100%_0%,rgba(22,163,94,0.14),transparent_55%),var(--ink)] py-7 md:py-14">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-5 2xl:max-w-[1320px] lg:grid-cols-[1fr_300px] lg:items-center">
        <div className="relative max-[640px]:flex max-[640px]:flex-col max-[640px]:items-center max-[640px]:text-center">
          <HeroGhost className="pointer-events-none absolute left-[10%] top-1/2 h-[640px] w-[640px] -translate-x-[38%] -translate-y-1/2 opacity-55 max-[640px]:left-1/2 max-[640px]:-top-10 max-[640px]:h-[280px] max-[640px]:w-[280px] max-[640px]:-translate-x-1/2 max-[640px]:translate-y-0 max-[640px]:opacity-15" />

          <div className="relative z-10 max-w-[480px]">
            <div className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[1.5px] text-whistle">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-whistle" />
              {hero.eyebrow}
            </div>
            <h1 className="mb-[18px] font-display text-[clamp(2.3rem,5.6vw,4rem)] uppercase leading-[0.97] tracking-wide">
              {renderHeadline(hero.headline, hero.headlineAccent)}
            </h1>
            <p className="mb-6 max-w-[38ch] text-[15px] text-floodlight-dim max-[640px]:mx-auto">
              {hero.description}
            </p>
            <div className="flex flex-wrap gap-3 max-[640px]:justify-center">
              <Link
                href={hero.primaryCta.href}
                className="rounded-lg bg-torch px-[18px] py-2.5 text-[13px] font-extrabold text-ink shadow-[0_4px_14px_-4px_rgba(245,185,66,0.5)] transition-all hover:-translate-y-px hover:bg-[#ffc766]"
              >
                {hero.primaryCta.label}
              </Link>
              <Link
                href={hero.secondaryCta.href}
                className="rounded-lg border border-line px-[18px] py-2.5 text-[13px] font-bold text-floodlight transition-colors hover:border-floodlight-faint hover:bg-charcoal-2"
              >
                {hero.secondaryCta.label} →
              </Link>
            </div>
          </div>

          <HeroFigure />
        </div>

        {sideStories.length > 0 ? (
          <aside className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[1.5px] text-floodlight-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-pitch-bright" />
              Right Now
            </div>
            {sideStories.map((story) => (
              <Link
                key={story.id}
                href={`/articles/${story.slug}`}
                className="flex cursor-pointer gap-3 rounded-[10px] border border-line bg-charcoal p-2.5 transition-all hover:-translate-y-0.5 hover:border-[rgba(245,185,66,0.3)]"
              >
                <div className="h-16 w-16 flex-none overflow-hidden rounded-lg border border-line bg-linear-to-br from-charcoal-3 to-charcoal-2">
                  {story.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={story.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <ArticleArtwork seed={story.slug} category={story.tag} />
                  )}
                </div>
                <div>
                  <Tag tag={story.tag} />
                  <h4 className="mb-1 mt-1 text-[13px] font-bold leading-tight">{story.title}</h4>
                  <span className="text-[11px] text-floodlight-faint">{story.time}</span>
                </div>
              </Link>
            ))}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
