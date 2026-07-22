import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// Shared shell for the legal pages — readable prose column, back link, and
// cross-links between Privacy and Terms.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal-shell">
      <div className="legal">
        <Link href="/" className="legal-back">
          <ChevronLeft size={16} strokeWidth={2.2} /> Back
        </Link>
        {children}
        <div className="legal-nav">
          <Link href="/legal/privacy">Privacy Policy</Link>
          <span>·</span>
          <Link href="/legal/terms">Terms of Use</Link>
        </div>
      </div>
    </div>
  )
}
