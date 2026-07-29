import Link from "next/link";
import { heroStory, heroSideStories } from "@/lib/mock-data";
import { HeroGhost } from "./hero-ghost";
import { HeroFigure } from "./hero-figure";
import { Tag } from "./tag";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(1100px_520px_at_18%_-20%,rgba(245,185,66,0.10),transparent_55%),radial-gradient(900px_460px_at_100%_0%,rgba(22,163,94,0.14),transparent_55%),var(--ink)] py-10 md:py-14">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-5 2xl:max-w-[1320px] lg:grid-cols-[1fr_300px] lg:items-center">
        <div className="relative max-[640px]:flex max-[640px]:flex-col max-[640px]:items-center max-[640px]:text-center">
          <HeroGhost className="pointer-events-none absolute left-[10%] top-1/2 h-[640px] w-[640px] -translate-x-[38%] -translate-y-1/2 opacity-55 max-[640px]:left-1/2 max-[640px]:top-[100px] max-[640px]:h-[340px] max-[640px]:w-[340px] max-[640px]:-translate-x-1/2 max-[640px]:translate-y-0 max-[640px]:opacity-40" />

          <div className="relative z-10 max-w-[480px] max-[640px]:max-w-full">
            <div className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[1.5px] text-whistle">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-whistle" />
              {heroStory.eyebrow}
            </div>
            <h1 className="mb-[18px] font-display text-[clamp(2.3rem,5.6vw,4rem)] uppercase leading-[0.97] tracking-wide">
              {heroStory.headlineLine1}
              <br />
              {heroStory.headlineLine2}
              <br />
              <span className="text-torch">{heroStory.headlineAccent}</span>
            </h1>
            <p className="mb-[26px] max-w-[420px] text-[15px] text-floodlight-dim max-[640px]:mx-auto">
              {heroStory.description}
            </p>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="#"
                className="rounded-lg bg-torch px-[18px] py-2.5 text-[13px] font-extrabold text-ink shadow-[0_4px_14px_-4px_rgba(245,185,66,0.5)] transition-all hover:-translate-y-px hover:bg-[#ffc766]"
              >
                {heroStory.primaryCta}
              </Link>
              <Link
                href="#"
                className="rounded-lg border border-line px-[18px] py-2.5 text-[13px] font-bold text-floodlight transition-colors hover:border-floodlight-faint hover:bg-charcoal-2"
              >
                {heroStory.secondaryCta} →
              </Link>
            </div>
          </div>

          <HeroFigure />
        </div>

        <aside className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[1.5px] text-floodlight-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-pitch-bright" />
            Right Now
          </div>
          {heroSideStories.map((story) => (
            <Link
              key={story.id}
              href="#"
              className="flex cursor-pointer gap-3 rounded-[10px] border border-line bg-charcoal p-2.5 transition-all hover:-translate-y-0.5 hover:border-[rgba(245,185,66,0.3)]"
            >
              <div className="h-16 w-16 flex-none rounded-lg border border-line bg-linear-to-br from-charcoal-3 to-charcoal-2" />
              <div>
                <Tag tag={story.tag} />
                <h4 className="mb-1 mt-1 text-[13px] font-bold leading-tight">{story.title}</h4>
                <span className="text-[11px] text-floodlight-faint">{story.time}</span>
              </div>
            </Link>
          ))}
        </aside>
      </div>
    </section>
  );
}
