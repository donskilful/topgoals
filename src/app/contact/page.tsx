import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PublicPage } from "@/components/public-page";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us — TopGoals",
  description:
    "Report a correction, send feedback, or get in touch with the TopGoals team about advertising or press enquiries.",
};

const REASONS = [
  {
    title: "Something's wrong",
    body: "A wrong score, a transfer that never happened, a tip logged with the wrong result. Corrections get priority — pick “Correction” and we'll fix it and say that we did.",
  },
  {
    title: "Feedback on the site",
    body: "Something slow, broken on your phone, or hard to read? We'd genuinely rather hear it than not.",
  },
  {
    title: "Advertising or press",
    body: "Partnerships, media enquiries, or anything commercial.",
  },
];

export default function ContactPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-[70ch]">
        <PageIntro
          eyebrow="Contact"
          title="Contact Us"
          description="Real people read every message. If we've got something wrong, telling us is the fastest way to see it fixed."
        />

        <div className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {REASONS.map((reason) => (
            <div key={reason.title} className="rounded-xl border border-line bg-charcoal p-4">
              <h2 className="mb-1.5 text-sm font-bold">{reason.title}</h2>
              <p className="text-[13px] leading-relaxed text-floodlight-dim">{reason.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-line bg-charcoal p-5 sm:p-6">
          <ContactForm />
        </div>

        <div className="mt-8 flex flex-col gap-3 text-[13px] leading-relaxed text-floodlight-dim">
          <p>
            <strong className="text-floodlight">How long we take:</strong> corrections are usually
            handled the same day. Everything else, we aim for a few days — we&apos;re a small
            team, not a call centre.
          </p>
          <p>
            <strong className="text-floodlight">What we do with your details:</strong> your name
            and email are used to reply to you and nothing else. They aren&apos;t added to any
            mailing list, and we don&apos;t pass them on. See the{" "}
            <Link href="/privacy" className="text-pitch-bright hover:underline">
              privacy policy
            </Link>{" "}
            for the full picture.
          </p>
          <p>
            <strong className="text-whistle">If gambling is causing you harm,</strong> we&apos;re
            not the right people to contact — please reach out to{" "}
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noreferrer noopener"
              className="text-pitch-bright hover:underline"
            >
              BeGambleAware
            </a>{" "}
            or call the National Gambling Helpline on 0808 8020 133 (UK, free, 24 hours). More
            support is listed on our{" "}
            <Link
              href="/privacy#responsible-gambling"
              className="text-pitch-bright hover:underline"
            >
              responsible gambling page
            </Link>
            .
          </p>
        </div>
      </div>
    </PublicPage>
  );
}
