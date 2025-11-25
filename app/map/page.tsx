'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'
import {
  VenueType,
  Gender,
  RestroomWithPhotos,
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
  STATUS_CONFIG,
} from '@/lib/types'
import { formatTime } from '@/lib/utils'

const libraries: ('places')[] = ['places']

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

  // Location search
  const [showLocationSearch, setShowLocationSearch] = useState(false)
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(true)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Filters
  const [genderFilter, setGenderFilter] = useState<Gender | null>(null)
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<Set<VenueType>>(new Set())
  const [showClosed, setShowClosed] = useState(false)

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocationName('Current Location')
          setCurrentCoords({ lat: latitude, lng: longitude })
          setIsUsingCurrentLocation(true)
          fetchNearbyVenues(latitude, longitude)
        },
        () => {
          setLocationName('Manhattan Beach, CA')
          setCurrentCoords({ lat: 33.8845, lng: -118.3976 })
          setIsUsingCurrentLocation(true)
          fetchNearbyVenues(33.8845, -118.3976)
        }
      )
    } else {
      setLocationName('Manhattan Beach, CA')
      setCurrentCoords({ lat: 33.8845, lng: -118.3976 })
      setIsUsingCurrentLocation(true)
      fetchNearbyVenues(33.8845, -118.3976)
    }
  }, [])

  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (place?.geometry?.location) {
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      // Get a friendly name for the location
      const name = place.name || place.formatted_address?.split(',')[0] || 'Selected Location'

      setLocationName(name)
      setCurrentCoords({ lat, lng })
      setIsUsingCurrentLocation(false)
      setShowLocationSearch(false)
      fetchNearbyVenues(lat, lng)
    }
  }, [])

  function returnToCurrentLocation() {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocationName('Current Location')
          setCurrentCoords({ lat: latitude, lng: longitude })
          setIsUsingCurrentLocation(true)
          fetchNearbyVenues(latitude, longitude)
        },
        () => {
          setLocationName('Manhattan Beach, CA')
          setCurrentCoords({ lat: 33.8845, lng: -118.3976 })
          setIsUsingCurrentLocation(true)
          fetchNearbyVenues(33.8845, -118.3976)
        }
      )
    }
  }

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

  function clearFilters() {
    setGenderFilter(null)
    setSelectedVenueTypes(new Set())
  }

  const hasActiveFilters = genderFilter !== null || selectedVenueTypes.size > 0

  // Filter venues
  const filteredVenues = venues.filter((venue) => {
    // Open/closed filter
    if (!showClosed && !venue.is_open) {
      return false
    }
    // Venue type filter
    if (selectedVenueTypes.size > 0 && !selectedVenueTypes.has(venue.venue_type)) {
      return false
    }
    // Gender filter
    if (genderFilter) {
      const hasMatch = venue.restrooms.some(
        (r) => r.gender === genderFilter || r.gender === 'all_gender'
      )
      if (!hasMatch) return false
    }
    return true
  })

  // Count open venues for the banner
  const openVenuesCount = venues.filter((v) => {
    if (selectedVenueTypes.size > 0 && !selectedVenueTypes.has(v.venue_type)) return false
    if (genderFilter) {
      const hasMatch = v.restrooms.some((r) => r.gender === genderFilter || r.gender === 'all_gender')
      if (!hasMatch) return false
    }
    return v.is_open
  }).length

  const totalMatchingVenues = venues.filter((v) => {
    if (selectedVenueTypes.size > 0 && !selectedVenueTypes.has(v.venue_type)) return false
    if (genderFilter) {
      const hasMatch = v.restrooms.some((r) => r.gender === genderFilter || r.gender === 'all_gender')
      if (!hasMatch) return false
    }
    return true
  }).length

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍼</span>
            <h1 className="text-xl font-bold text-teal-600">DiaperPal</h1>
          </div>

          {/* View Toggle Pills */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                view === 'list'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>📋</span>
              <span>List</span>
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                view === 'map'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>🗺️</span>
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* Location Bar */}
        <button
          onClick={() => setShowLocationSearch(true)}
          className="mt-2 flex items-center text-sm text-gray-600 hover:text-teal-600 transition w-full"
        >
          <span className="text-teal-600">📍</span>
          <span className="ml-1 flex-1 text-left">{locationName}</span>
          {!isUsingCurrentLocation && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                returnToCurrentLocation()
              }}
              className="text-gray-400 hover:text-gray-600 px-2"
              title="Return to current location"
            >
              ×
            </span>
          )}
          <span className="text-gray-400 text-xs">Change</span>
        </button>
      </header>

      {/* Location Search Modal */}
      {showLocationSearch && isLoaded && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowLocationSearch(false)}>
          <div
            className="absolute top-0 left-0 right-0 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setShowLocationSearch(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ←
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Search Location</h2>
              </div>

              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{
                  componentRestrictions: { country: 'us' },
                  types: ['geocode', 'establishment'],
                }}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for a city, address, or place..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-base"
                  autoFocus
                />
              </Autocomplete>

              <button
                onClick={() => {
                  returnToCurrentLocation()
                  setShowLocationSearch(false)
                }}
                className="mt-4 w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition"
              >
                <span className="text-teal-600 text-xl">📍</span>
                <div>
                  <p className="font-medium text-gray-900">Use Current Location</p>
                  <p className="text-sm text-gray-500">Find venues near you</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        {/* Restroom Type Label + Chips */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Restroom Type
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.entries(GENDER_CONFIG) as [Gender, { emoji: string; label: string }][]).map(
              ([gender, config]) => (
                <button
                  key={gender}
                  onClick={() => toggleGender(gender)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition border-2 ${
                    genderFilter === gender
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-teal-600'
                  }`}
                >
                  {config.emoji} {config.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Venue Type Label + Chips */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Venue Type
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.entries(VENUE_TYPE_CONFIG) as [VenueType, { emoji: string; label: string }][]).map(
              ([type, config]) => (
                <button
                  key={type}
                  onClick={() => toggleVenueType(type)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-medium text-sm whitespace-nowrap transition border-2 ${
                    selectedVenueTypes.has(type)
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-teal-600'
                  }`}
                >
                  {config.emoji} {config.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex justify-center pt-1">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              × Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Open/Closed Toggle Banner */}
      {!loading && !error && venues.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              {showClosed ? (
                <>
                  <span className="text-blue-800">
                    Showing all {totalMatchingVenues} venue{totalMatchingVenues !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setShowClosed(false)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Show only open
                  </button>
                </>
              ) : (
                <>
                  <span className="text-blue-800">
                    Showing {openVenuesCount} open venue{openVenuesCount !== 1 ? 's' : ''}
                  </span>
                  {totalMatchingVenues > openVenuesCount && (
                    <button
                      onClick={() => setShowClosed(true)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Show all {totalMatchingVenues} including closed
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
          <div className="space-y-3">
            {filteredVenues.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-center">
                {venues.length === 0
                  ? 'No venues found nearby. Check back soon!'
                  : openVenuesCount === 0 && !showClosed
                  ? 'No open venues match your filters. Try showing closed venues.'
                  : 'No venues match your filters.'}
              </div>
            ) : (
              filteredVenues.map((venue) => {
                const displayRestrooms = getDisplayRestrooms(venue.restrooms)

                return (
                  <div
                    key={venue.id}
                    onClick={() => router.push(`/location/${venue.id}`)}
                    className="bg-white rounded-xl border-2 border-gray-200 p-4 cursor-pointer hover:border-teal-400 hover:shadow-md transition group"
                  >
                    {/* Row 1: Venue Name + Distance Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl flex-shrink-0">
                          {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji}
                        </span>
                        <h3 className="font-bold text-lg text-gray-900 truncate">
                          {venue.name}
                        </h3>
                      </div>
                      <span className="flex-shrink-0 bg-teal-100 text-teal-700 font-semibold text-sm px-2.5 py-1 rounded-full">
                        📍 {venue.distance_display}
                      </span>
                    </div>

                    {/* Row 2: Category + Open/Closed Status */}
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-gray-500">
                        {VENUE_TYPE_CONFIG[venue.venue_type]?.label}
                      </span>
                      <span className="text-gray-300">·</span>
                      {venue.is_open ? (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Open
                          {venue.hours_today && (
                            <span className="text-gray-500 font-normal">
                              until {formatTime(venue.hours_today.close)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-red-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          Closed
                          {venue.hours_today && (
                            <span className="text-gray-500 font-normal">
                              · Opens {formatTime(venue.hours_today.open)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Restrooms */}
                    <div className="mt-3 space-y-2">
                      {displayRestrooms.map((restroom) => (
                        <div
                          key={restroom.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span>{GENDER_CONFIG[restroom.gender]?.emoji}</span>
                            <span className="font-medium text-gray-900">
                              {GENDER_CONFIG[restroom.gender]?.label}
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="text-gray-600">
                              {STATION_LOCATION_CONFIG[restroom.station_location]?.emoji}{' '}
                              {STATION_LOCATION_CONFIG[restroom.station_location]?.label}
                            </span>
                          </div>
                          <span>
                            {restroom.status === 'verified_present' ? (
                              <span className="text-green-600" title="Verified">✅</span>
                            ) : (
                              <span className="text-gray-400 text-xs">❓</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer: Directions Button + Chevron */}
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        onClick={(e) => handleDirections(venue, e)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2 text-sm"
                      >
                        🧭 Directions
                      </button>
                      <span className="text-gray-400 group-hover:text-teal-600 transition text-xl">
                        →
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Map View */}
        {!loading && !error && view === 'map' && (
          <div className="relative">
            {/* Map Area - Placeholder */}
            <div className="bg-gradient-to-b from-teal-100 to-teal-50 min-h-[60vh] rounded-xl border border-teal-200 relative overflow-hidden">
              {/* Grid lines to simulate map */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(10)].map((_, i) => (
                  <div key={`h-${i}`} className="absolute w-full h-px bg-teal-600" style={{ top: `${i * 10}%` }} />
                ))}
                {[...Array(10)].map((_, i) => (
                  <div key={`v-${i}`} className="absolute h-full w-px bg-teal-600" style={{ left: `${i * 10}%` }} />
                ))}
              </div>

              {/* Sample venue pins */}
              {filteredVenues.slice(0, 5).map((venue, index) => (
                <div
                  key={venue.id}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition"
                  style={{
                    left: `${20 + (index * 15)}%`,
                    top: `${25 + ((index % 3) * 20)}%`,
                  }}
                  onClick={() => router.push(`/location/${venue.id}`)}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-white rounded-full border-2 border-teal-600 flex items-center justify-center shadow-lg">
                      <span className="text-lg">{VENUE_TYPE_CONFIG[venue.venue_type]?.emoji}</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-teal-600 rotate-45" />
                  </div>
                </div>
              ))}

              {/* Mapbox setup message */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🗺️</span>
                  <div>
                    <p className="font-semibold text-gray-900">Map Coming Soon</p>
                    <p className="text-sm text-gray-600">
                      Add NEXT_PUBLIC_MAPBOX_TOKEN to enable full map view
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sheet Preview - shows when venue would be selected */}
            {filteredVenues.length > 0 && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 shadow-lg">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/location/${filteredVenues[0].id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {VENUE_TYPE_CONFIG[filteredVenues[0].venue_type]?.emoji}
                      </span>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {filteredVenues[0].name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {VENUE_TYPE_CONFIG[filteredVenues[0].venue_type]?.label}
                        </p>
                      </div>
                    </div>
                    <span className="bg-teal-100 text-teal-700 font-semibold text-sm px-2.5 py-1 rounded-full">
                      📍 {filteredVenues[0].distance_display}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {filteredVenues[0].is_open ? (
                        <>
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-green-600 font-medium">Open</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="text-red-500 font-medium">Closed</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDirections(filteredVenues[0], e)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg text-sm"
                    >
                      🧭 Directions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
