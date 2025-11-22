'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Facility {
  id: string
  privacy_type: string
  gender: string
  verification_status: string
  station_location: string
  safety_concern: boolean
  cleanliness_issue: boolean
}

interface NearbyLocation {
  id: string
  name: string
  address: string
  distance: number
  lat: number
  lng: number
  venue_type: string
  facilities: Facility[]
}

export default function MapPage() {
  const [view, setView] = useState<'map' | 'list'>('list')
  const [stations, setStations] = useState<NearbyLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [genderFilter, setGenderFilter] = useState<'all' | 'mens' | 'womens'>('all')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          fetchNearbyStations(latitude, longitude)
        },
        (err) => {
          console.error('Geolocation error:', err)
          setError('Unable to get your location. Please enable location services.')
          setLoading(false)
        }
      )
    } else {
      setError('Geolocation is not supported by your browser.')
      setLoading(false)
    }
  }, [])

  async function fetchNearbyStations(lat: number, lng: number) {
    try {
      const response = await fetch(
        `/api/locations/nearby?lat=${lat}&lng=${lng}&radius=5`
      )
      const data = await response.json()
      setStations(data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching stations:', err)
      setError('Failed to load nearby stations')
      setLoading(false)
    }
  }

  function getVenueTypeEmoji(type: string) {
    switch (type) {
      case 'food_drink': return '☕'
      case 'shopping': return '🛍️'
      case 'parks_outdoors': return '🌳'
      case 'family_attractions': return '🎨'
      case 'errands': return '📋'
      default: return '📍'
    }
  }

  function getPrivacyLabel(facility: Facility) {
    if (facility.privacy_type === 'private') return 'Private Room'
    if (facility.privacy_type === 'multi_stall' && facility.station_location === 'accessible_stall') return 'Private Stall'
    if (facility.privacy_type === 'multi_stall' && facility.station_location === 'open_wall') return 'Open Wall'
    return ''
  }

  function getGenderIcon(gender: string) {
    switch (gender) {
      case 'mens': return '👨'
      case 'womens': return '👩'
      case 'all_gender': return '🚻'
      default: return ''
    }
  }

  function getGenderLabel(gender: string) {
    switch (gender) {
      case 'mens': return "Men's"
      case 'womens': return "Women's"
      case 'all_gender': return 'All-Gender'
      default: return gender
    }
  }

  function formatDistance(miles: number) {
    if (miles < 0.3) {
      const feet = Math.round(miles * 5280)
      return `${feet} ft`
    }
    return `${miles.toFixed(1)} mi`
  }

  // Filter facilities based on gender selection
  function getMatchingFacilities(facilities: Facility[]) {
    if (genderFilter === 'all') return facilities
    return facilities.filter(f =>
      f.gender === genderFilter || f.gender === 'all_gender'
    )
  }

  // Count venues with matching facilities
  function countVenuesWithGender(gender: 'mens' | 'womens') {
    return stations.filter(station =>
      station.facilities.some(f => f.gender === gender || f.gender === 'all_gender')
    ).length
  }

  // Filter stations based on gender filter
  const filteredStations = genderFilter === 'all'
    ? stations
    : stations.filter(station =>
        station.facilities.some(f => f.gender === genderFilter || f.gender === 'all_gender')
      )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* View Toggle */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={() => setView('map')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              view === 'map'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🗺️ Map
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              view === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 List
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Gender Filter */}
        {!loading && !error && stations.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Filter by restroom:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setGenderFilter(genderFilter === 'mens' ? 'all' : 'mens')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition text-base ${
                  genderFilter === 'mens'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border-2 border-blue-500 text-blue-500'
                }`}
              >
                👨 Men's ({countVenuesWithGender('mens')})
              </button>
              <button
                onClick={() => setGenderFilter(genderFilter === 'womens' ? 'all' : 'womens')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition text-base ${
                  genderFilter === 'womens'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border-2 border-blue-500 text-blue-500'
                }`}
              >
                👩 Women's ({countVenuesWithGender('womens')})
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Finding nearby stations...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
            {error}
          </div>
        )}

        {!loading && !error && filteredStations.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-center">
            {stations.length === 0
              ? 'No venues found nearby. Check back soon!'
              : 'No venues match this filter.'}
          </div>
        )}

        {/* List View */}
        {view === 'list' && filteredStations.length > 0 && (
          <div className="space-y-4">
            {filteredStations.map((station) => {
              const matchingFacilities = getMatchingFacilities(station.facilities)
              const verifiedFacilities = matchingFacilities.filter(
                f => f.verification_status === 'verified_present'
              )
              const unverifiedFacilities = matchingFacilities.filter(
                f => f.verification_status === 'unverified'
              )
              const otherGenders = station.facilities
                .filter(f => !matchingFacilities.includes(f))
                .map(f => getGenderLabel(f.gender))

              return (
                <div key={station.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  {/* Header: Venue name + distance */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getVenueTypeEmoji(station.venue_type)}</span>
                      <h3 className="font-bold text-lg text-gray-900">{station.name}</h3>
                    </div>
                    <span className="text-blue-600 font-semibold">
                      {formatDistance(station.distance)}
                    </span>
                  </div>

                  {/* Facilities */}
                  <div className="space-y-1 mb-3">
                    {verifiedFacilities.map((facility) => (
                      <div key={facility.id} className="text-sm text-gray-700 flex items-center gap-1">
                        <span className="text-green-600">✅</span>
                        <span>{getGenderIcon(facility.gender)}</span>
                        <span>{getGenderLabel(facility.gender)}</span>
                        {getPrivacyLabel(facility) && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{getPrivacyLabel(facility)}</span>
                          </>
                        )}
                      </div>
                    ))}
                    {unverifiedFacilities.map((facility) => (
                      <div key={facility.id} className="text-sm text-gray-500 flex items-center gap-1">
                        <span>❓</span>
                        <span>{getGenderIcon(facility.gender)}</span>
                        <span>{getGenderLabel(facility.gender)}</span>
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
                  <div className="flex gap-3 mt-3">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg text-center transition"
                    >
                      📍 Directions
                    </a>
                    <Link
                      href={`/location/${station.id}`}
                      className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-lg text-center transition"
                    >
                      ⓘ Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Map View - Placeholder */}
        {view === 'map' && stations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 p-8 text-center">
              <p className="text-blue-800 font-semibold mb-2">🗺️ Map View Coming Soon!</p>
              <p className="text-blue-600 text-sm">
                {stations.length} venues near you • Switch to List view for now
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
