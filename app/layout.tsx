import type { Metadata } from 'next'
import Link from 'next/link'
import { Providers } from '@/components/Providers'
import './globals.css'

// Force dynamic rendering to ensure auth context has access to cookies/session
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'DiaperPal - Find Changing Stations',
  description: 'Find verified changing stations nearby',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <Providers>
          <nav className="bg-blue-500 text-white p-4">
            <Link href="/" className="font-bold text-lg">
              DiaperPal
            </Link>
          </nav>
          <main className="container mx-auto">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}