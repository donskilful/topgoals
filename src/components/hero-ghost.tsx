export function HeroGhost({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="96" fill="none" stroke="var(--floodlight)" strokeWidth="1" />
      <path
        d="M100 20 L124 56 L100 92 L76 56 Z"
        fill="none"
        stroke="var(--floodlight)"
        strokeWidth="1"
      />
      <path
        d="M100 20 L100 4M124 56 L168 46M76 56 L32 46M100 92 L136 130M100 92 L64 130"
        fill="none"
        stroke="var(--floodlight)"
        strokeWidth="1"
      />
      <path d="M4 100 A96 96 0 0 1 100 4" fill="none" stroke="var(--floodlight)" strokeWidth="1" />
    </svg>
  );
}
