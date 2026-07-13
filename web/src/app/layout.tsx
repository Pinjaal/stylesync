import type { Metadata, Viewport } from 'next'
import { Bodoni_Moda, Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from './_components/ServiceWorkerRegister'

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-bodoni',
  display: 'swap',
})

const space = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
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
  themeColor: '#ee4127',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${space.variable} ${spaceMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes onto <body> before React hydrates — harmless, so ignore it. */}
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
