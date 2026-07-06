// The StyleSync four-point "spark" — used for Spark, the AI stylist.
export function Spark({
  className,
  filled = true,
}: {
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 0c.6 5.7 2.3 7.4 8 8-5.7.6-7.4 2.3-8 8-.6-5.7-2.3-7.4-8-8 5.7-.6 7.4-2.3 8-8Z" />
    </svg>
  )
}
