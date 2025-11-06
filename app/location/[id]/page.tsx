'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { LocationDetail } from '@/lib/types'

export default function LocationPage() {
  const params = useParams()
  const id = params?.id as string
  const [station, setStation] = useState<LocationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    if (!id) return

    async function fetchStation() {
      try {
        const response = await fetch(`/api/locations/${id}`)
        if (!response.ok) {
          throw new Error('Station not found')
        }
        const data = await response.json()
        setStation(data)
      } catch (err) {
        setError('Failed to load station details')
      } finally {
        setLoading(false)
      }
    }

    fetchStation()
  }, [id])

  async function handleVote(voteType: 'up' | 'down') {
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: id,
          vote_type: voteType,
        }),
      })
      setVoted(true)
      setTimeout(() => setVoted(false), 2000)
    } catch (err) {
      console.error('Vote failed:', err)
    }
  }

  async function handleReport() {
    const issue = prompt('What issue did you notice?')
    if (!issue) return

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: id,
          issue_type: issue,
        }),
      })
      alert('Thank you for reporting this issue!')
    } catch (err) {
      console.error('Report failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (error || !station) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Station not found'}</p>
          <Link href="/map" className="text-blue-600 hover:underline">
            Back to map
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <Link
          href="/map"
          className="text-blue-600 hover:text-blue-800 font-semibold mb-4 inline-block"
        >
          ← Back to Map
        </Link>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {station.name}
          </h1>
          <p className="text-gray-600 mb-6">{station.address}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Privacy
              </p>
              <p className="text-lg font-semibold text-gray-900">
                🔒 {station.privacy}
              </p>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Cleanliness
              </p>
              <p className="text-lg font-semibold text-gray-900">
                ⭐ {station.cleanliness}/5
              </p>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Gender Access
              </p>
              <p className="text-lg font-semibold text-gray-900">
                👥 {station.gender_accessibility}
              </p>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Last Verified
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {station.last_verified}
              </p>
            </div>
          </div>

          {station.issues && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Notes:</strong> {station.issues}
              </p>
            </div>
          )}

          <div className="bg-blue-50 rounded p-4 mb-6">
            <p className="text-sm text-gray-600">
              👍 {station.votes_up} people said this was accurate
            </p>
            <p className="text-sm text-gray-600">
              👎 {station.votes_down} reported issues
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() =>
              window.open(
                `https://www.google.com/maps/search/${encodeURIComponent(
                  station.address
                )}`
              )
            }
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            📍 Get Directions
          </button>

          <button
            onClick={() => handleVote('up')}
            className={`w-full font-bold py-3 px-4 rounded-lg transition ${
              voted
                ? 'bg-green-500 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            {voted ? '✓ Thanks for voting!' : '👍 Still Accurate?'}
          </button>

          <button
            onClick={handleReport}
            className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-3 px-4 rounded-lg border border-red-200 transition"
          >
            ⚠️ Report Issue
          </button>
        </div>
      </div>
    </div>
  )
}