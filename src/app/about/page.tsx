import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PublicPage } from "@/components/public-page";

export const metadata: Metadata = {
  title: "About Us — TopGoals",
  description:
    "Who runs TopGoals, how we write our betting tips, and why we publish every result — including the losing ones.",
};

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-9">
      <h2 className="mb-3 font-display text-xl uppercase tracking-wide">{title}</h2>
      <div className="flex flex-col gap-3.5 text-[15px] leading-relaxed text-floodlight-dim">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-[70ch]">
        <PageIntro
          eyebrow="About"
          title="About TopGoals"
          description="A football site built around two ideas: that the score should load instantly wherever you are, and that a tipster who hides their losses isn't worth reading."
        />

        <Section title="What we do">
          <p>
            TopGoals covers football — mainly the Premier League, La Liga, Serie A, the
            Bundesliga, Ligue 1 and European competition. We publish live scores, daily
            betting tips, transfer news, match reports and goal highlights.
          </p>
          <p>
            We&apos;re not trying to cover every league on earth. We&apos;d rather do a
            smaller number of competitions properly than list everything badly.
          </p>
        </Section>

        <Section title="How we write our tips">
          <p>
            Every tip is a judgement call made by a person, informed by form, team news,
            head-to-head record, and where we think the market has mispriced something. We
            publish the selection, the odds available at the time, and a confidence rating
            from one to four so you can see how strongly we actually feel about it.
          </p>
          <p>
            We are not a syndicate, we don&apos;t have inside information, and we have no
            model that beats the bookmakers. Anyone who tells you otherwise is selling
            something.
          </p>
        </Section>

        <Section title="Why we publish our losses">
          <p>
            Our win rate and running profit on the{" "}
            <Link href="/tips" className="text-pitch-bright hover:underline">
              tips page
            </Link>{" "}
            are calculated automatically from every settled tip we have posted. Nobody types
            that number in by hand, which means we can&apos;t quietly round it up after a bad
            week.
          </p>
          <p>
            Losing tips stay on the site permanently, in the same table as the winners. A
            record that only shows successes tells you nothing about what to expect, and the
            whole point of a track record is that it&apos;s falsifiable.
          </p>
        </Section>

        <Section title="Why the site is so fast">
          <p>
            Most of our readers are on a phone, often on mobile data, and sometimes on a
            connection that struggles. So speed is treated as a feature rather than an
            afterthought: pages are pre-rendered as plain HTML, the artwork is drawn with
            code instead of downloaded as images, fonts are served from our own domain, and
            images are compressed and sized for your screen before they reach you.
          </p>
          <p>
            The practical result is that the scores appear even on a weak signal, which is
            usually exactly when you want them.
          </p>
        </Section>

        <Section title="Corrections and contact" id="contact">
          <p>
            If we&apos;ve got something wrong — a wrong score, a transfer that didn&apos;t
            happen, a tip recorded with the wrong result — we want to know, and we&apos;ll fix
            it and say that we did.
          </p>
          <p>
            Live scores are currently updated by our team rather than an automated feed, so
            there can be a short delay during busy periods. We&apos;re working on that.
          </p>
          <p>
            <Link href="/contact" className="text-pitch-bright hover:underline">
              Send us a message
            </Link>{" "}
            — corrections are usually handled the same day.
          </p>
        </Section>

        <div className="rounded-xl border border-line bg-charcoal p-5 text-[13px] leading-relaxed text-floodlight-dim">
          <p className="mb-2 font-bold text-floodlight">
            <span className="text-whistle">18+</span> A word on betting
          </p>
          <p>
            Nothing on this site is financial advice, and no tip is a certainty. Betting
            should be entertainment you can comfortably afford — never a way to make money
            or recover losses. If it stops feeling like entertainment, free and confidential
            support is available at{" "}
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noreferrer noopener"
              className="text-floodlight underline"
            >
              BeGambleAware.org
            </a>
            . Our full policy is on the{" "}
            <Link href="/privacy#responsible-gambling" className="text-pitch-bright hover:underline">
              privacy and responsible gambling page
            </Link>
            .
          </p>
        </div>
      </div>
    </PublicPage>
  );
}
