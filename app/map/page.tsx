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

  function getPrivacyLevel(facility: Facility) {
    if (facility.privacy_type === 'private') return '🔒🔒🔒 High'
    if (facility.privacy_type === 'multi_stall' && facility.station_location === 'accessible_stall') return '🔒🔒 Medium'
    return '🔒 Low'
  }

  function getGenderLabel(gender: string) {
    switch (gender) {
      case 'mens': return '👨 Men\'s'
      case 'womens': return '👩 Women\'s'
      case 'all_gender': return '🚻 All-gender'
      default: return gender
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex gap-2 z-10">
        <button
          onClick={() => setView('map')}
          className={`flex-1 py-2 px-4 rounded font-semibold transition ${
            view === 'map'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🗺️ Map
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex-1 py-2 px-4 rounded font-semibold transition ${
            view === 'list'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📋 List
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4">
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

        {!loading && !error && stations.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            No verified stations found nearby. Check back soon!
          </div>
        )}

        {view === 'list' && stations.length > 0 && (
          <div className="space-y-3">
            <p className="text-gray-600 text-sm mb-4">
              {stations.length} venues nearby
            </p>
            {stations.map((station) => {
              const verifiedFacilities = station.facilities.filter(
                f => f.verification_status === 'verified_present'
              )
              
              return (
                <Link key={station.id} href={`/location/${station.id}`}>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getVenueTypeEmoji(station.venue_type)}</span>
                        <h3 className="font-bold text-gray-900">{station.name}</h3>
                      </div>
                      <span className="text-blue-600 font-semibold text-sm bg-blue-50 px-2 py-1 rounded">
                        {station.distance.toFixed(1)} mi
                      </span>
                    </div>

                    {verifiedFacilities.length > 0 ? (
                      <div className="space-y-1">
                        {verifiedFacilities.map((facility) => (
                          <div key={facility.id} className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{getGenderLabel(facility.gender)}</span>
                            <span>•</span>
                            <span>{getPrivacyLevel(facility)}</span>
                            {facility.safety_concern && (
                              <>
                                <span>•</span>
                                <span className="text-red-600">⚠️ Safety</span>
                              </>
                            )}
                            {facility.cleanliness_issue && (
                              <>
                                <span>•</span>
                                <span className="text-yellow-600">⚠️ Clean</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No verified stations yet</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {view === 'map' && stations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 p-4 text-center">
              <p className="text-gray-600 text-sm">
                📍 {stations.length} venues near your location
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Tap a venue below to see details
              </p>
            </div>
            <div className="space-y-2 p-4">
              {stations.slice(0, 5).map((station) => {
                const verifiedCount = station.facilities.filter(
                  f => f.verification_status === 'verified_present'
                ).length
                
                return (
                  <Link key={station.id} href={`/location/${station.id}`}>
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded p-3 hover:shadow-md transition cursor-pointer">
                      <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                        <span>{getVenueTypeEmoji(station.venue_type)}</span>
                        <span>{station.distance.toFixed(1)} mi - {station.name}</span>
                      </div>
                      <div className="text-xs text-blue-800">
                        {verifiedCount} verified restroom{verifiedCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}