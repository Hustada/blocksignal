import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BlockSignal - Real-Time BTC Price Monitor',
  description: 'A sleek, low-latency crypto monitoring dashboard with real-time alerts and multi-exchange support.',
  keywords: ['crypto', 'bitcoin', 'price', 'monitor', 'dashboard', 'alerts'],
  authors: [{ name: 'BlockSignal' }],
  icons: {
    icon: '/images/new-favicon1.png',
    shortcut: '/images/new-favicon1.png',
    apple: '/images/new-favicon1.png',
  },
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#CC5500',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.className} bg-charcoal text-white min-h-screen`}>
        <div className="min-h-screen bg-gradient-to-br from-charcoal via-charcoal to-gray-900">
          {children}
        </div>
      </body>
    </html>
  )
}