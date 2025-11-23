'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  VenueType,
  Gender,
  RestroomWithPhotos,
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
  STATUS_CONFIG,
} from '@/lib/types'

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
  const [view, setView] = useState<'map' | 'list'>('list')
  const [venues, setVenues] = useState<NearbyVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Filters
  const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all')
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<Set<VenueType>>(new Set())
  const [openNowFilter, setOpenNowFilter] = useState(false)

  // Refs for horizontal scroll
  const venueTypeScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          fetchNearbyVenues(latitude, longitude)
        },
        (err) => {
          console.error('Geolocation error:', err)
          // Default to Manhattan Beach if GPS denied
          setUserLocation({ lat: 33.8845, lng: -118.3976 })
          fetchNearbyVenues(33.8845, -118.3976)
        }
      )
    } else {
      setError('Geolocation is not supported by your browser.')
      setLoading(false)
    }
  }, [])

  async function fetchNearbyVenues(lat: number, lng: number) {
    try {
      setLoading(true)
      const response = await fetch(`/api/venues/nearby?lat=${lat}&lng=${lng}&radius=8`)
      const data = await response.json()

      if (Array.isArray(data)) {
        setVenues(data)
      } else {
        setVenues([])
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching venues:', err)
      setError('Failed to load nearby venues')
      setLoading(false)
    }
  }

  // Toggle venue type in multi-select
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

  // Filter venues based on current filters
  const filteredVenues = venues.filter((venue) => {
    // Venue type filter (empty = show all)
    if (selectedVenueTypes.size > 0 && !selectedVenueTypes.has(venue.venue_type)) {
      return false
    }

    // Open now filter
    if (openNowFilter && !venue.is_open) {
      return false
    }

    // Gender filter
    if (genderFilter !== 'all') {
      const hasMatchingRestroom = venue.restrooms.some(
        (r) => r.gender === genderFilter || r.gender === 'all_gender'
      )
      if (!hasMatchingRestroom) return false
    }

    return true
  })

  // Get matching restrooms for display (based on gender filter)
  function getMatchingRestrooms(restrooms: RestroomWithPhotos[]): RestroomWithPhotos[] {
    if (genderFilter === 'all') return restrooms
    return restrooms.filter((r) => r.gender === genderFilter || r.gender === 'all_gender')
  }

  // Count venues with each gender
  function countVenuesWithGender(gender: Gender): number {
    return venues.filter((v) =>
      v.restrooms.some((r) => r.gender === gender || r.gender === 'all_gender')
    ).length
  }

  // Get other genders not matching current filter
  function getOtherGenders(restrooms: RestroomWithPhotos[]): string[] {
    if (genderFilter === 'all') return []
    const otherGenders = restrooms
      .filter((r) => r.gender !== genderFilter && r.gender !== 'all_gender')
      .map((r) => GENDER_CONFIG[r.gender].label)
    return [...new Set(otherGenders)]
  }

  // Track direction click
  async function handleDirectionsClick(venue: NearbyVenue, e: React.MouseEvent) {
    e.preventDefault()

    // Track click
    try {
      await fetch('/api/direction-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venue.id }),
      })
    } catch (err) {
      console.error('Failed to track direction click:', err)
    }

    // Open maps - iOS uses Apple Maps, others use Google Maps
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${venue.lat},${venue.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`

    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header with View Toggle */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* View Toggle */}
        <div className="px-4 py-3">
          <div className="max-w-2xl mx-auto flex gap-2">
            <button
              onClick={() => setView('map')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                view === 'map'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                view === 'list'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 List
            </button>
          </div>
        </div>

        {/* Filters */}
        {!loading && !error && venues.length > 0 && (
          <div className="px-4 pb-3 space-y-3">
            {/* Row 1: Gender Filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setGenderFilter('all')}
                className={`flex-shrink-0 py-2 px-4 rounded-full font-semibold text-sm transition whitespace-nowrap ${
                  genderFilter === 'all'
                    ? 'bg-gray-700 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                All ({venues.length})
              </button>
              <button
                onClick={() => setGenderFilter(genderFilter === 'mens' ? 'all' : 'mens')}
                className={`flex-shrink-0 py-2 px-4 rounded-full font-semibold text-sm transition whitespace-nowrap ${
                  genderFilter === 'mens'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-blue-300 text-blue-600 hover:border-blue-400'
                }`}
              >
                👨 Men's ({countVenuesWithGender('mens')})
              </button>
              <button
                onClick={() => setGenderFilter(genderFilter === 'womens' ? 'all' : 'womens')}
                className={`flex-shrink-0 py-2 px-4 rounded-full font-semibold text-sm transition whitespace-nowrap ${
                  genderFilter === 'womens'
                    ? 'bg-pink-600 text-white'
                    : 'bg-white border border-pink-300 text-pink-600 hover:border-pink-400'
                }`}
              >
                👩 Women's ({countVenuesWithGender('womens')})
              </button>
              <button
                onClick={() => setOpenNowFilter(!openNowFilter)}
                className={`flex-shrink-0 py-2 px-4 rounded-full font-semibold text-sm transition whitespace-nowrap ${
                  openNowFilter
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-green-300 text-green-600 hover:border-green-400'
                }`}
              >
                🕐 Open Now
              </button>
            </div>

            {/* Row 2: Venue Type Filter (multi-select) */}
            <div
              ref={venueTypeScrollRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
            >
              {(Object.entries(VENUE_TYPE_CONFIG) as [VenueType, { emoji: string; label: string }][]).map(
                ([type, config]) => {
                  const isSelected = selectedVenueTypes.has(type)
                  return (
                    <button
                      key={type}
                      onClick={() => toggleVenueType(type)}
                      className={`flex-shrink-0 py-2 px-3 rounded-full font-semibold text-sm transition whitespace-nowrap flex items-center gap-1 ${
                        isSelected
                          ? 'bg-teal-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-teal-400'
                      }`}
                    >
                      {isSelected && <span>✓</span>}
                      {config.emoji} {config.label}
                    </button>
                  )
                }
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Finding nearby venues...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
            {error}
          </div>
        )}

        {!loading && !error && filteredVenues.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-center">
            {venues.length === 0
              ? 'No venues found nearby. Check back soon!'
              : 'No venues match your filters.'}
          </div>
        )}

        {/* List View */}
        {view === 'list' && filteredVenues.length > 0 && (
          <div className="space-y-4">
            {filteredVenues.map((venue) => {
              const matchingRestrooms = getMatchingRestrooms(venue.restrooms)
              const verifiedRestrooms = matchingRestrooms.filter((r) => r.status === 'verified_present')
              const unverifiedRestrooms = matchingRestrooms.filter((r) => r.status === 'unverified')
              const otherGenders = getOtherGenders(venue.restrooms)

              return (
                <div
                  key={venue.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header: Venue name + distance */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl flex-shrink-0">
                          {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji || '📍'}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">{venue.name}</h3>
                          {venue.rating && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <span className="text-amber-500">★</span>
                              <span>{venue.rating}</span>
                              {venue.review_count && (
                                <span className="text-gray-400">({venue.review_count})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-teal-600 font-bold text-lg">
                          {venue.distance_display}
                        </span>
                        <div className="text-xs mt-0.5">
                          {venue.is_open ? (
                            <span className="text-green-600 font-medium">Open</span>
                          ) : (
                            <span className="text-red-500 font-medium">Closed</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Restrooms */}
                    <div className="space-y-1.5 my-3">
                      {verifiedRestrooms.map((restroom) => (
                        <div
                          key={restroom.id}
                          className="text-sm text-gray-700 flex items-center gap-1.5"
                        >
                          <span className="text-green-600">{STATUS_CONFIG.verified_present.emoji}</span>
                          <span>{GENDER_CONFIG[restroom.gender].emoji}</span>
                          <span className="font-medium">{GENDER_CONFIG[restroom.gender].label}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">
                            {STATION_LOCATION_CONFIG[restroom.station_location].label}
                          </span>
                        </div>
                      ))}
                      {unverifiedRestrooms.map((restroom) => (
                        <div
                          key={restroom.id}
                          className="text-sm text-gray-500 flex items-center gap-1.5"
                        >
                          <span>{STATUS_CONFIG.unverified.emoji}</span>
                          <span>{GENDER_CONFIG[restroom.gender].emoji}</span>
                          <span>{GENDER_CONFIG[restroom.gender].label}</span>
                          <span className="text-gray-400">•</span>
                          <span>Unverified</span>
                        </div>
                      ))}
                    </div>

                    {/* Other genders available */}
                    {genderFilter !== 'all' && otherGenders.length > 0 && (
                      <p className="text-xs text-gray-500 mb-3">
                        (Also has {otherGenders.join(' & ')})
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={(e) => handleDirectionsClick(venue, e)}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg text-center transition"
                      >
                        Get Directions
                      </button>
                      <Link
                        href={`/location/${venue.id}`}
                        className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-lg text-center transition"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Map View - Placeholder for Mapbox */}
        {view === 'map' && venues.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-teal-50 p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-teal-800 font-semibold mb-2">Map View Coming Soon!</p>
              <p className="text-teal-600 text-sm mb-4">
                {filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''} near you
              </p>
              <p className="text-gray-500 text-xs">
                Mapbox integration pending setup
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add custom scrollbar hide CSS */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
