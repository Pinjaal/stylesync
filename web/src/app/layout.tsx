import type { Metadata, Viewport } from 'next'
import { Instrument_Sans } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from './_components/ServiceWorkerRegister'

// One typeface for the whole app. The design direction is "one clear accent,
// honest typography, no decorative clutter" — the Bodoni serif / Space Mono
// pairing is retired. globals.css points --font-display/-body/-mono all here,
// so every existing rule re-themes without being touched.
const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StyleSync — Your closet, styled.',
  description: 'Your AI-powered wardrobe and outfit stylist.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StyleSync',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#c4462f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${instrument.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes onto <body> before React hydrates — harmless, so ignore it. */}
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
