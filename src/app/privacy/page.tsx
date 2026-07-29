import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PublicPage } from "@/components/public-page";

export const metadata: Metadata = {
  title: "Privacy Policy — TopGoals",
  description:
    "What data TopGoals collects, how it's used, your rights over it, and our responsible gambling policy.",
};

/** Update when the policy text materially changes. */
const LAST_UPDATED = "29 July 2026";

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-9 scroll-mt-24">
      <h2 className="mb-3 font-display text-xl uppercase tracking-wide">{title}</h2>
      <div className="flex flex-col gap-3.5 text-[15px] leading-relaxed text-floodlight-dim">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-[70ch]">
        <PageIntro
          eyebrow={`Last updated ${LAST_UPDATED}`}
          title="Privacy Policy"
          description="Written to be read. If anything here is unclear, that's a fault in the writing and we'd like to hear about it."
        />

        <Section title="The short version">
          <p>
            We collect as little as we can get away with. We don&apos;t sell your data, we
            don&apos;t run advertising trackers, and there is no account to create unless you
            choose to subscribe to our tips.
          </p>
        </Section>

        <Section title="What we collect">
          <p>
            <strong className="text-floodlight">If you just read the site:</strong> our hosting
            provider processes your IP address and browser user-agent to serve pages and to
            protect against abuse. We keep aggregate, non-identifying counts of which pages are
            popular. We do not build a profile of you.
          </p>
          <p>
            <strong className="text-floodlight">If you subscribe to daily tips:</strong> we store
            the email address or messaging handle you give us, and the date you subscribed. That
            is all we need in order to send you tips.
          </p>
          <p>
            <strong className="text-floodlight">If you&apos;re a member of staff:</strong> our CMS
            stores your name, email, a securely hashed password, and a log of the content
            changes you make. Passwords are hashed with bcrypt and cannot be read by us or
            anyone else.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use one strictly necessary cookie, and only for signed-in staff: a session cookie
            that keeps you logged in to the CMS. It is removed when you sign out.
          </p>
          <p>
            We do not use advertising, profiling or cross-site tracking cookies, which is why
            you have not been shown a consent banner — there is nothing to consent to.
          </p>
        </Section>

        <Section title="How your data is used">
          <p>
            Only for the purpose you gave it. A subscription email is used to send you tips and
            nothing else. We do not sell, rent or trade personal data, and we do not share it
            with advertisers or data brokers.
          </p>
          <p>
            We rely on a small number of service providers to run the site — hosting,
            database and media storage — who process data on our behalf under their own
            contractual obligations.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Subscription details are kept until you unsubscribe, after which they are deleted.
            Staff accounts are kept while the person has access. Entries in the content audit
            log are kept indefinitely, because the point of that record is to show who changed
            what.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask us for a copy of the data we hold about you, ask us to correct it, or
            ask us to delete it. You can withdraw consent for tip emails at any time using the
            unsubscribe link, or by contacting us. We will respond within 30 days.
          </p>
          <p>
            If you are in the UK or EU you also have the right to complain to your data
            protection authority.
          </p>
        </Section>

        <Section title="Children">
          <p>
            This site covers sports betting and is intended for adults aged 18 or over. We do
            not knowingly collect data from anyone under 18. If you believe a child has
            submitted information to us, contact us and we will delete it.
          </p>
        </Section>

        <Section title="Responsible gambling" id="responsible-gambling">
          <p>
            The betting tips on this site are opinions. They are not predictions, guarantees,
            or financial advice, and no analysis can make an uncertain outcome certain. Odds
            shown are the odds available when a tip was published and will change.
          </p>
          <p>Some things we believe and will keep saying:</p>
          <ul className="ml-5 flex list-disc flex-col gap-2">
            <li>Only ever stake money you can comfortably afford to lose.</li>
            <li>
              Never bet to recover a loss. Chasing losses is the single most reliable way to
              turn a bad day into a serious problem.
            </li>
            <li>Set a limit before you start, and treat it as fixed.</li>
            <li>
              Betting should be entertainment. If it starts to feel like work, obligation, or a
              way out of a financial hole, stop.
            </li>
          </ul>
          <p>
            Free, confidential help is available — you do not need to be in crisis to use it:
          </p>
          <ul className="ml-5 flex list-disc flex-col gap-2">
            <li>
              <a
                href="https://www.begambleaware.org"
                target="_blank"
                rel="noreferrer noopener"
                className="text-pitch-bright hover:underline"
              >
                BeGambleAware
              </a>{" "}
              — advice and a 24-hour National Gambling Helpline (0808 8020 133, UK).
            </li>
            <li>
              <a
                href="https://www.gamcare.org.uk"
                target="_blank"
                rel="noreferrer noopener"
                className="text-pitch-bright hover:underline"
              >
                GamCare
              </a>{" "}
              — free counselling and support.
            </li>
            <li>
              <a
                href="https://www.gamstop.co.uk"
                target="_blank"
                rel="noreferrer noopener"
                className="text-pitch-bright hover:underline"
              >
                GAMSTOP
              </a>{" "}
              — self-exclude from all UK-licensed online gambling operators at once.
            </li>
          </ul>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we change this policy we will update the date at the top of the page. If a change
            materially affects how we handle your data, we will say so clearly rather than
            quietly editing the text.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For anything relating to your data or this policy, get in touch via our{" "}
            <Link href="/about#contact" className="text-pitch-bright hover:underline">
              contact details
            </Link>
            .
          </p>
        </Section>
      </div>
    </PublicPage>
  );
}
