import type { ArticleCategory } from "@/lib/constants";

/**
 * Original artwork for an article that has no photograph.
 *
 * Every article needs a visual, and most automated ones will never have a licensed
 * photograph — so rather than reuse a publisher's image (which is copyright
 * infringement whether or not a watermark is added over it, and sports photography is
 * the most actively enforced category there is), each article gets a card generated
 * from the site's own visual language: floodlit pitch geometry in TopGoals' palette.
 *
 * Free to serve, impossible to get a takedown for, and it looks like this site rather
 * than someone else's.
 *
 * Deterministic: the layout is derived from the article slug, so a given article always
 * renders the identical card (server and client agree, and it doesn't flicker between
 * visits) while different articles look distinct.
 */

/**
 * FNV-1a. Any stable string hash would do; this one is short, has no dependencies and
 * spreads short slugs well enough that neighbouring articles don't look alike.
 */
function hash(seed: string): number {
  let value = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }

  return value >>> 0;
}

const PALETTES: Record<ArticleCategory, { accent: string; glow: string }> = {
  // Green for match and team news, gold for transfers — the same coding the Tag
  // component already uses, so the artwork reads as part of the same system.
  News: { accent: "var(--pitch-bright)", glow: "rgba(34, 201, 116, 0.34)" },
  Transfer: { accent: "var(--torch)", glow: "rgba(245, 185, 66, 0.34)" },
};

export function ArticleArtwork({
  seed,
  category,
  className = "",
}: {
  /** Any stable per-article string — the slug is ideal. */
  seed: string;
  category: ArticleCategory;
  className?: string;
}) {
  const value = hash(seed);
  const { accent, glow } = PALETTES[category];

  // Each visual property reads a different slice of the hash, so they vary
  // independently rather than moving together.
  const glowX = 20 + (value % 60);
  const glowY = 12 + ((value >> 6) % 44);
  const tilt = -22 + ((value >> 12) % 45);
  const arcOffset = ((value >> 18) % 26) - 13;
  // Four bands of pitch stripes, offset so the mowing pattern doesn't always align
  // with the frame edge.
  const stripeShift = (value >> 24) % 24;

  /**
   * `slice` rather than the default `meet`: these cards are used at 16:9 and at 78×78,
   * and cropping a square composition keeps the geometry filling the frame instead of
   * letterboxing it.
   */
  return (
    <svg
      viewBox="0 0 160 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={`turf-${value}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--charcoal-3)" />
          <stop offset="100%" stopColor="var(--ink)" />
        </linearGradient>
        <radialGradient id={`glow-${value}`} cx={`${glowX}%`} cy={`${glowY}%`} r="62%">
          <stop offset="0%" stopColor={glow} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="160" height="160" fill={`url(#turf-${value})`} />

      {/* Mown stripes — very low contrast, just enough to read as grass. */}
      <g opacity="0.5">
        {[0, 1, 2, 3].map((band) => (
          <rect
            key={band}
            x={-20 + band * 48 + stripeShift}
            y="-20"
            width="24"
            height="200"
            fill="var(--charcoal-2)"
            transform={`rotate(${tilt} 80 80)`}
          />
        ))}
      </g>

      <rect width="160" height="160" fill={`url(#glow-${value})`} />

      {/* Pitch markings: halfway line, centre circle, and the arc of a penalty area. */}
      <g
        fill="none"
        stroke={accent}
        strokeOpacity="0.5"
        strokeWidth="1.6"
        transform={`rotate(${tilt} 80 80)`}
      >
        <line x1="-20" y1="80" x2="180" y2="80" />
        <circle cx="80" cy="80" r="26" />
        <circle cx="80" cy="80" r="2.4" fill={accent} fillOpacity="0.85" stroke="none" />
        <path d={`M ${18 + arcOffset} 24 A 44 44 0 0 1 ${18 + arcOffset} 136`} strokeOpacity="0.28" />
      </g>
    </svg>
  );
}
