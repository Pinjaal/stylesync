// The StyleSync brand mark — the hanger badge (concept-d-badge).
// Self-colored (vermilion badge, white hanger), so it ignores CSS `color`.
export function HangerLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect x="16" y="16" width="480" height="480" rx="112" fill="#EE4127" />
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={26}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(-7,0)"
      >
        <path d="M256,230 v-22 a30,30 0 1 1 30,-30" />
        <path d="M256,230 L398,340 a13,13 0 0 1 -8,23 H122 a13,13 0 0 1 -8,-23 Z" />
      </g>
    </svg>
  )
}
