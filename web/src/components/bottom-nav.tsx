'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shirt, Sparkles, Clock, User } from 'lucide-react'

const tabs = [
  { href: '/closet',  label: 'Closet',  icon: Shirt },
  { href: '/outfit',  label: 'Outfit',  icon: Sparkles },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <ul className="flex justify-around max-w-md mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center py-3 text-xs transition-colors ${
                  active ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" strokeWidth={active ? 2.5 : 2} />
                <span className={active ? 'font-medium' : ''}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}