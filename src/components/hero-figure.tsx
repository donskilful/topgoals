/**
 * A CSS-only illustrated athlete silhouette — no image asset, so it costs
 * nothing on a slow connection. Rim-lit gold to sit against the floodlight glow.
 */
export function HeroFigure() {
  const part =
    "fig-part absolute bg-linear-to-br from-charcoal-3 to-ink shadow-[inset_1px_1px_0_rgba(245,185,66,0.3),inset_-1px_-1px_0_rgba(0,0,0,0.4)]";

  return (
    <div
      aria-hidden="true"
      /**
       * On phones this sits *behind* the copy rather than above it. As a block it
       * pushed the headline more than half a screen down — 320px of decoration
       * before the first word, on the device most readers use. Scaled with
       * `scale` rather than a smaller width/height so the parts, which are
       * positioned at fixed offsets, shrink together instead of overflowing.
       */
      className="pointer-events-none absolute -top-4 right-0 h-[360px] w-[280px] drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] max-[640px]:-right-4 max-[640px]:-top-6 max-[640px]:origin-top-right max-[640px]:scale-[0.58] max-[640px]:opacity-35"
    >
      <div className="absolute right-[-40px] top-[10px] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(245,185,66,0.30),transparent_65%)] blur-[6px]" />

      <div className="absolute left-[170px] top-[96px] h-0.5 w-[46px] -rotate-[8deg] rounded-sm bg-linear-to-r from-transparent to-[rgba(245,185,66,0.55)]" />
      <div className="absolute left-[176px] top-[106px] h-0.5 w-[34px] -rotate-[4deg] rounded-sm bg-linear-to-r from-transparent to-[rgba(245,185,66,0.55)]" />

      <div className={`${part} left-[150px] top-[96px] h-[170px] w-[32px] origin-top rotate-[112deg] rounded-2xl`} />
      <div className={`${part} left-[56px] top-[74px] h-[96px] w-[22px] -rotate-[32deg] rounded-2xl`} />
      <div className={`${part} left-[184px] top-[70px] h-[88px] w-[22px] rotate-[50deg] rounded-2xl`} />
      <div className={`${part} left-[96px] top-16 h-[130px] w-[78px] rotate-[-6deg] rounded-[40px]`} />
      <div className={`${part} left-[100px] top-[172px] h-[130px] w-[30px] rotate-[12deg] rounded-2xl`} />
      <div className={`${part} left-[118px] top-[26px] h-[52px] w-[52px] rounded-full`} />

      <div className="absolute left-[222px] top-[88px] h-[26px] w-[26px] rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--floodlight),var(--floodlight-dim)_70%)] shadow-[0_0_14px_2px_rgba(245,185,66,0.4)]" />
    </div>
  );
}
