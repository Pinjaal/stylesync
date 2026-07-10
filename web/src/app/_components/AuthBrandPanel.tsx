// Desktop-only left panel on the auth screens (hidden on phones via CSS).
export function AuthBrandPanel() {
  return (
    <aside className="auth-brand">
      <svg className="logo" viewBox="0 0 512 512" aria-hidden>
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
      <h2>
        Your closet,
        <br />
        <em>styled.</em>
      </h2>
      <p>
        Build outfits from the clothes you already own — with an AI stylist that
        actually gets your vibe.
      </p>
      <div className="foot">STYLESYNC</div>
    </aside>
  )
}
