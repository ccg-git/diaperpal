'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-md mx-auto pt-20">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">DiaperPal</h1>
          <p className="text-gray-600 mb-8">
            Find verified changing stations nearby
          </p>

          <div className="space-y-4">
            <Link
              href="/map"
              className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg transition text-center"
            >
              🗺️ Emergency Mode
            </Link>

            <Link
              href="/admin"
              className="block w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition text-center"
            >
              ➕ Add Location
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Beta Version - Help us verify locations!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}