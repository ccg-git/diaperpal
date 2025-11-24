'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  VenueType,
  Gender,
  RestroomWithPhotos,
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
} from '@/lib/types'
import { formatTime } from '@/lib/utils'

interface NearbyVenue {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: VenueType
  distance: number
  distance_display: string
  is_open: boolean
  hours_today: { open: string; close: string } | null
  rating: number | null
  review_count: number | null
  restrooms: RestroomWithPhotos[]
}

export default function MapPage() {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [venues, setVenues] = useState<NearbyVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationName, setLocationName] = useState('Finding location...')

  // Filters
  const [genderFilter, setGenderFilter] = useState<Gender | null>(null)
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<Set<VenueType>>(new Set())

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocationName('Manhattan Beach, CA') // TODO: Reverse geocode
          fetchNearbyVenues(latitude, longitude)
        },
        () => {
          setLocationName('Manhattan Beach, CA')
          fetchNearbyVenues(33.8845, -118.3976)
        }
      )
    } else {
      setLocationName('Manhattan Beach, CA')
      fetchNearbyVenues(33.8845, -118.3976)
    }
  }, [])

  async function fetchNearbyVenues(lat: number, lng: number) {
    try {
      setLoading(true)
      const response = await fetch(`/api/venues/nearby?lat=${lat}&lng=${lng}&radius=8`)
      const data = await response.json()
      setVenues(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching venues:', err)
      setError('Failed to load nearby venues')
      setLoading(false)
    }
  }

  function toggleGender(gender: Gender) {
    setGenderFilter(genderFilter === gender ? null : gender)
  }

  function toggleVenueType(type: VenueType) {
    setSelectedVenueTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // Filter venues
  const filteredVenues = venues.filter((venue) => {
    if (selectedVenueTypes.size > 0 && !selectedVenueTypes.has(venue.venue_type)) {
      return false
    }
    if (genderFilter) {
      const hasMatch = venue.restrooms.some(
        (r) => r.gender === genderFilter || r.gender === 'all_gender'
      )
      if (!hasMatch) return false
    }
    return true
  })

  // Get display restrooms based on filter
  function getDisplayRestrooms(restrooms: RestroomWithPhotos[]) {
    if (!genderFilter) return restrooms
    return restrooms.filter((r) => r.gender === genderFilter || r.gender === 'all_gender')
  }

  // Track direction click
  async function handleDirections(venue: NearbyVenue, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await fetch('/api/direction-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venue.id }),
      })
    } catch {}

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${venue.lat},${venue.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍼</span>
          <h1 className="text-xl font-bold text-teal-600">DiaperPal</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">📍 {locationName}</p>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        {/* Gender Filter Row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => toggleGender('womens')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition ${
              genderFilter === 'womens'
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            👩 Women's
          </button>
          <button
            onClick={() => toggleGender('mens')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition ${
              genderFilter === 'mens'
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            👨 Men's
          </button>
        </div>

        {/* Venue Type Filter Row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.entries(VENUE_TYPE_CONFIG) as [VenueType, { emoji: string; label: string }][]).map(
            ([type, config]) => (
              <button
                key={type}
                onClick={() => toggleVenueType(type)}
                className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium text-sm whitespace-nowrap transition ${
                  selectedVenueTypes.has(type)
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700'
                }`}
              >
                {config.emoji} {config.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Finding nearby venues...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && view === 'list' && (
          <div className="space-y-4">
            {filteredVenues.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-center">
                {venues.length === 0
                  ? 'No venues found nearby. Check back soon!'
                  : 'No venues match your filters.'}
              </div>
            ) : (
              filteredVenues.map((venue) => {
                const displayRestrooms = getDisplayRestrooms(venue.restrooms)

                return (
                  <div
                    key={venue.id}
                    onClick={() => router.push(`/location/${venue.id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition"
                  >
                    {/* Header Row */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="font-bold text-lg text-gray-900">{venue.name}</h3>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                          {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji} {venue.venue_type.replace('_', ' & ').replace('_', ' ')}
                        </p>
                        {venue.rating && (
                          <p className="text-sm text-gray-600 mt-1">
                            ⭐ {venue.rating} ({venue.review_count} reviews)
                          </p>
                        )}
                      </div>
                      <span className="text-2xl font-bold text-teal-600">
                        {venue.distance_display}
                      </span>
                    </div>

                    {/* Restrooms */}
                    <div className="mt-3 space-y-2">
                      {displayRestrooms.map((restroom) => (
                        <div key={restroom.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span>{GENDER_CONFIG[restroom.gender]?.emoji}</span>
                            <span className="font-medium text-gray-900">
                              {GENDER_CONFIG[restroom.gender]?.label} Restroom
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {STATION_LOCATION_CONFIG[restroom.station_location]?.emoji} {STATION_LOCATION_CONFIG[restroom.station_location]?.label}
                            </span>
                            {restroom.status === 'verified_present' && (
                              <span className="text-green-600">✅</span>
                            )}
                            {restroom.status === 'unverified' && (
                              <span className="text-gray-400 text-xs">? Unverified</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {venue.is_open ? (
                          <>
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-green-600 font-medium text-sm">Open</span>
                            {venue.hours_today && (
                              <span className="text-gray-500 text-sm">
                                until {formatTime(venue.hours_today.close)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-red-500 font-medium text-sm">Closed</span>
                            {venue.hours_today && (
                              <span className="text-gray-500 text-sm">
                                Opens {formatTime(venue.hours_today.open)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDirections(venue, e)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-lg transition flex items-center gap-2"
                      >
                        🧭 Directions
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Map View Placeholder */}
        {!loading && !error && view === 'map' && (
          <div className="bg-teal-50 rounded-xl border border-teal-200 min-h-[60vh] flex flex-col items-center justify-center">
            <span className="text-6xl mb-4">🗺️</span>
            <p className="text-teal-800 font-semibold">Map View Coming Soon</p>
            <p className="text-teal-600 text-sm mt-1">Mapbox integration pending</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 ${
              view === 'list' ? 'text-teal-600' : 'text-gray-500'
            }`}
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs font-medium">List</span>
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 ${
              view === 'map' ? 'text-teal-600' : 'text-gray-500'
            }`}
          >
            <span className="text-2xl">🗺️</span>
            <span className="text-xs font-medium">Map</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
