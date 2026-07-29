import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { LiveTicker } from "@/components/live-ticker";
import { TrustStrip } from "@/components/trust-strip";
import { TodaysPicks } from "@/components/todays-picks";
import { GoalsHighlights } from "@/components/goals-highlights";
import { LatestNews } from "@/components/latest-news";
import { StandingsWidget } from "@/components/sidebar/standings-widget";
import { TrendingTips } from "@/components/sidebar/trending-tips";
import { NewsletterCard } from "@/components/sidebar/newsletter-card";
import { SiteFooter } from "@/components/site-footer";
import { MobileTabbar } from "@/components/mobile-tabbar";

/**
 * Regenerate at most once a minute.
 *
 * The page is otherwise prerendered and served as static HTML — which is what keeps
 * it fast on a weak connection — but live scores and "2 hours ago" timestamps would
 * be frozen at build time without this. CMS edits still push through immediately via
 * revalidatePath; this only covers content that goes stale on its own.
 */
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <Hero />
      <LiveTicker />
      <TrustStrip />

      <main className="mx-auto max-w-[1180px] px-5 2xl:max-w-[1320px]">
        <section className="grid grid-cols-1 items-start gap-7 py-9 md:grid-cols-[1.15fr_0.85fr]">
          <TodaysPicks />
          <GoalsHighlights />
        </section>

        <section className="grid grid-cols-1 items-start gap-9 py-9 lg:grid-cols-[1fr_336px]">
          <LatestNews />
          <aside className="flex flex-col gap-5 lg:sticky lg:top-[84px]">
            <StandingsWidget />
            <TrendingTips />
            <NewsletterCard />
          </aside>
        </section>
      </main>

      <SiteFooter />
      <MobileTabbar />
    </>
  );
}
