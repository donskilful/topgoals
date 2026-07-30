import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileTabbar } from "@/components/mobile-tabbar";

/** Chrome shared by every public page below the homepage. */
export function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-[1180px] px-5 py-9 2xl:max-w-[1320px]">
        {children}
      </main>
      <SiteFooter />
      <MobileTabbar />
    </>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-7">
      {eyebrow ? (
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[1.5px] text-torch">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] uppercase leading-none tracking-wide">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-floodlight-dim">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-charcoal p-8 text-center">
      <p className="text-sm text-floodlight-dim">{children}</p>
    </div>
  );
}
