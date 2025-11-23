import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
  STATUS_CONFIG,
  VenueType,
  Gender,
  StationLocation,
  VerificationStatus,
} from '@/lib/types'
import { formatTime } from '@/lib/utils'

interface Restroom {
  id: string
  gender: Gender
  station_location: StationLocation
  restroom_location_text: string | null
  status: VerificationStatus
  verified_at: string | null
  photos: { id: string; image_url: string; is_primary: boolean }[]
}

interface VenueDetail {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: VenueType
  hours_json: Record<string, { open: string; close: string }> | null
  rating: number | null
  review_count: number | null
  photo_urls: string[] | null
  is_open: boolean
  hours_today: { open: string; close: string } | null
  restrooms: Restroom[]
}

async function getVenueDetails(id: string): Promise<VenueDetail | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || 3000}`

  try {
    const res = await fetch(`${baseUrl}/api/venues/${id}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return null
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching venue:', error)
    return null
  }
}

// Track direction click (server action)
async function trackDirectionClick(venueId: string) {
  'use server'

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || 3000}`

  try {
    await fetch(`${baseUrl}/api/direction-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue_id: venueId }),
    })
  } catch (error) {
    console.error('Error tracking click:', error)
  }
}

export default async function LocationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const venue = await getVenueDetails(params.id)

  if (!venue) {
    notFound()
  }

  const verifiedRestrooms = venue.restrooms.filter((r) => r.status === 'verified_present')
  const unverifiedRestrooms = venue.restrooms.filter((r) => r.status === 'unverified')

  // Get directions URL
  const isIOS = false // Can't detect on server, default to Google Maps
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link
            href="/map"
            className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Venue Header */}
        <div className="bg-white p-6 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <span className="text-3xl">
              {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji || '📍'}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
              <p className="text-gray-600 mt-1">{venue.address}</p>

              {/* Rating */}
              {venue.rating && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-amber-500 text-lg">★</span>
                  <span className="font-semibold">{venue.rating}</span>
                  {venue.review_count && (
                    <span className="text-gray-500 text-sm">
                      ({venue.review_count} reviews)
                    </span>
                  )}
                </div>
              )}

              {/* Open Status */}
              <div className="mt-2">
                {venue.is_open ? (
                  <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Open
                    {venue.hours_today && (
                      <span className="text-gray-500 font-normal">
                        · Closes {formatTime(venue.hours_today.close)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-500 font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    Closed
                    {venue.hours_today && (
                      <span className="text-gray-500 font-normal">
                        · Opens {formatTime(venue.hours_today.open)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Get Directions Button */}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-lg text-center transition"
          >
            Get Directions
          </a>
        </div>

        {/* Restrooms Section */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Changing Stations ({venue.restrooms.length})
          </h2>

          {/* Verified Restrooms */}
          {verifiedRestrooms.length > 0 && (
            <div className="space-y-3 mb-6">
              {verifiedRestrooms.map((restroom) => (
                <div
                  key={restroom.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">
                      {STATUS_CONFIG.verified_present.emoji}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {GENDER_CONFIG[restroom.gender].emoji}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {GENDER_CONFIG[restroom.gender].label}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span>{STATION_LOCATION_CONFIG[restroom.station_location].emoji}</span>
                          <span>{STATION_LOCATION_CONFIG[restroom.station_location].label}</span>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-500">
                            {STATION_LOCATION_CONFIG[restroom.station_location].description}
                          </span>
                        </div>

                        {restroom.restroom_location_text && (
                          <p className="text-gray-500 mt-1">
                            📍 {restroom.restroom_location_text}
                          </p>
                        )}
                      </div>

                      {/* Photos */}
                      {restroom.photos && restroom.photos.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                          {restroom.photos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.image_url}
                              alt="Restroom"
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unverified Restrooms */}
          {unverifiedRestrooms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Unverified
              </h3>
              {unverifiedRestrooms.map((restroom) => (
                <div
                  key={restroom.id}
                  className="bg-gray-50 rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>{STATUS_CONFIG.unverified.emoji}</span>
                    <span>{GENDER_CONFIG[restroom.gender].emoji}</span>
                    <span>{GENDER_CONFIG[restroom.gender].label}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">Needs verification</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No restrooms */}
          {venue.restrooms.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-center">
              No changing station data available yet.
            </div>
          )}
        </div>

        {/* Venue Photos */}
        {venue.photo_urls && venue.photo_urls.length > 0 && (
          <div className="p-6 pt-0">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Photos</h2>
            <div className="grid grid-cols-2 gap-2">
              {venue.photo_urls.slice(0, 4).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`${venue.name} photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
