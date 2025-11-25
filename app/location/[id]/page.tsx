import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
  STATUS_CONFIG,
  VenueType,
  Gender,
  StationLocation,
  VerificationStatus,
  HoursJson,
} from '@/lib/types'
import { formatTime, getFormattedWeeklyHours, isVenueOpen, getTodayHours } from '@/lib/utils'
import DirectionsButton from './DirectionsButton'

interface Restroom {
  id: string
  gender: Gender
  station_location: StationLocation
  restroom_location_text: string | null
  status: VerificationStatus
  verified_at: string | null
  safety_notes: string | null
  photos: { id: string; image_url: string; is_primary: boolean }[]
}

interface VenueDetail {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: VenueType
  hours_json: HoursJson | null
  rating: number | null
  review_count: number | null
  photo_urls: string[] | null
  is_open: boolean
  hours_today: { open: string; close: string } | null
  restrooms: Restroom[]
}

async function getVenueDetails(id: string): Promise<VenueDetail | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Fetch venue with restrooms and photos
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select(`
        *,
        restrooms (
          *,
          photos:restroom_photos(*)
        )
      `)
      .eq('id', id)
      .single()

    if (venueError || !venue) {
      console.error('Error fetching venue:', venueError)
      return null
    }

    // Filter out verified_absent restrooms (don't show to users)
    const filteredRestrooms = (venue.restrooms || []).filter(
      (r: { status: string }) => r.status !== 'verified_absent'
    )

    // Calculate open status
    const is_open = isVenueOpen(venue.hours_json)
    const hours_today = getTodayHours(venue.hours_json)

    return {
      ...venue,
      restrooms: filteredRestrooms,
      is_open,
      hours_today,
    }
  } catch (error) {
    console.error('Error fetching venue:', error)
    return null
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

  // Get weekly hours
  const weeklyHours = getFormattedWeeklyHours(venue.hours_json)

  // Collect all tips from restrooms
  const tips = venue.restrooms
    .filter((r) => r.safety_notes)
    .map((r) => r.safety_notes!)

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
          <DirectionsButton venueId={venue.id} lat={venue.lat} lng={venue.lng} />
        </div>

        {/* Tips Section */}
        {tips.length > 0 && (
          <div className="p-6 pb-0">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Tips</h3>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  {/* Restroom Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {GENDER_CONFIG[restroom.gender].emoji}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {GENDER_CONFIG[restroom.gender].label} Restroom
                          </div>
                          <div className="text-sm text-gray-500">
                            {STATUS_CONFIG.verified_present.emoji} Verified
                          </div>
                        </div>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium">
                        {STATION_LOCATION_CONFIG[restroom.station_location].emoji}{' '}
                        {STATION_LOCATION_CONFIG[restroom.station_location].label}
                      </span>
                    </div>

                    {/* Station Location Description */}
                    <p className="text-sm text-gray-500 mt-3">
                      {STATION_LOCATION_CONFIG[restroom.station_location].description}
                    </p>

                    {/* Location Text */}
                    {restroom.restroom_location_text && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                        📍 {restroom.restroom_location_text}
                      </p>
                    )}
                  </div>

                  {/* Photos */}
                  {restroom.photos && restroom.photos.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                      <div className="flex gap-2 overflow-x-auto">
                        {restroom.photos.map((photo) => (
                          <img
                            key={photo.id}
                            src={photo.image_url}
                            alt="Restroom"
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>{STATUS_CONFIG.unverified.emoji}</span>
                      <span>{GENDER_CONFIG[restroom.gender].emoji}</span>
                      <span className="font-medium">{GENDER_CONFIG[restroom.gender].label}</span>
                    </div>
                    <span className="text-xs text-gray-500">Needs verification</span>
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

        {/* Hours Section */}
        {venue.hours_json && (
          <div className="p-6 pt-0">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Hours</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {weeklyHours.map(({ day, hours, isToday }) => (
                <div
                  key={day}
                  className={`flex justify-between px-4 py-3 ${
                    isToday ? 'bg-teal-50' : ''
                  }`}
                >
                  <span className={`font-medium ${isToday ? 'text-teal-700' : 'text-gray-700'}`}>
                    {day}
                    {isToday && (
                      <span className="ml-2 text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </span>
                  <span className={`${hours === 'Closed' ? 'text-red-500' : 'text-gray-600'}`}>
                    {hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Bottom Padding */}
        <div className="h-8" />
      </div>
    </div>
  )
}
