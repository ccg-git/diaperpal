'use client'

import { useState, useEffect } from 'react'

interface LocationForm {
  name: string
  venue_type: string
  address: string
  lat: number | null
  lng: number | null
  facility_type: 'mens' | 'womens' | 'family' | 'allgender'
  verification_status: 'verified_present' | 'verified_absent' | 'unverified'
  privacy_level: 'private' | 'semi_private' | 'exposed'
  cleanliness_rating: number
  strap_condition: 'good' | 'dirty' | 'broken' | 'missing'
  safety_rating: 'safe' | 'questionable' | 'unsafe'
  issues: string
}

const initialForm: LocationForm = {
  name: '',
  venue_type: 'restaurant',
  address: '',
  lat: null,
  lng: null,
  facility_type: 'family',
  verification_status: 'verified_present',
  privacy_level: 'private',
  cleanliness_rating: 3,
  strap_condition: 'good',
  safety_rating: 'safe',
  issues: '',
}

export default function AdminPage() {
  const [location, setLocation] = useState<LocationForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      setGpsLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }))
          setGpsLoading(false)
        },
        (error) => {
          console.error('GPS error:', error)
          setGpsLoading(false)
        }
      )
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!location.name || !location.address || !location.lat || !location.lng) {
      setMessage('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      })

      if (response.ok) {
        setMessage('✓ Location added successfully!')
        setLocation(initialForm)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            setLocation((prev) => ({
              ...prev,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }))
          })
        }
      } else {
        setMessage('Error adding location. Please try again.')
      }
    } catch (error) {
      console.error('Submit error:', error)
      setMessage('Error submitting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ➕ Verify Location
          </h1>
          <p className="text-gray-600 mb-8">
            Help us build the most accurate map of changing stations
          </p>

          {message && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                message.includes('✓')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {gpsLoading
                  ? '📍 Getting your location...'
                  : location.lat && location.lng
                    ? `✓ Location detected: ${location.lat.toFixed(
                        4
                      )}, ${location.lng.toFixed(4)}`
                    : '⚠️ Unable to detect location'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Venue Name *
              </label>
              <input
                type="text"
                value={location.name}
                onChange={(e) =>
                  setLocation({ ...location, name: e.target.value })
                }
                placeholder="e.g., Starbucks, Target, Library"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Venue Type *
              </label>
              <select
                value={location.venue_type}
                onChange={(e) =>
                  setLocation({ ...location, venue_type: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="retail">Retail</option>
                <option value="park">Park</option>
                <option value="library">Library</option>
                <option value="museum">Museum</option>
                <option value="bar">Bar/Brewery</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                value={location.address}
                onChange={(e) =>
                  setLocation({ ...location, address: e.target.value })
                }
                placeholder="Street address"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Restroom Type *
              </label>
              <select
                value={location.facility_type}
                onChange={(e) =>
                  setLocation({
                    ...location,
                    facility_type: e.target.value as LocationForm['facility_type'],
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mens">Men's Restroom</option>
                <option value="womens">Women's Restroom</option>
                <option value="family">Family Restroom</option>
                <option value="allgender">All-Gender Restroom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Changing Station Status *
              </label>
              <select
                value={location.verification_status}
                onChange={(e) =>
                  setLocation({
                    ...location,
                    verification_status: e.target.value as LocationForm['verification_status'],
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="verified_present">✓ Has Changing Station</option>
                <option value="verified_absent">✗ NO Changing Station</option>
                <option value="unverified">? Not Yet Verified</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Privacy Level
              </label>
              <select
                value={location.privacy_level}
                onChange={(e) =>
                  setLocation({
                    ...location,
                    privacy_level: e.target.value as LocationForm['privacy_level'],
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="private">🔒 Private (in stall/single-use)</option>
                <option value="semi_private">⚠️ Semi-Private (alcove)</option>
                <option value="exposed">❌ Exposed (open wall)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cleanliness (station + area): {location.cleanliness_rating}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={location.cleanliness_rating}
                onChange={(e) =>
                  setLocation({
                    ...location,
                    cleanliness_rating: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>1 = Dirty</span>
                <span>5 = Spotless</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Strap Condition
              </label>
              <select
                value={location.strap_condition}
                onChange={(e) =>
                  setLocation({
                    ...location,
                    strap_condition: e.target.value as LocationForm['strap_condition'],
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="good">✓ Good</option>
                <option value="dirty">⚠️ Dirty but Works</option>
                <option value="broken">✗ Broken</option>
                <option value="missing">✗ Missing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Safety Rating - Did it feel safe?
              </label>
              <select
                value={location.safety_rating}
                onChange={(e) =>
                  setLocation({
                    ...location,
                    safety_rating: e.target.value as LocationForm['safety_rating'],
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="safe">✓ Safe (would trust it)</option>
                <option value="questionable">⚠️ Questionable</option>
                <option value="unsafe">✗ Unsafe (DO NOT USE)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Issues or Notes (optional)
              </label>
              <textarea
                value={location.issues}
                onChange={(e) =>
                  setLocation({ ...location, issues: e.target.value })
                }
                placeholder="e.g., 'Blocks doorway when open', 'Gets wet from sink', 'Very spacious'"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg tran