import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
  VenueType,
  Gender,
  StationLocation,
  VerificationStatus,
  HoursJson,
} from '@/lib/types'
import { formatTime, getFormattedWeeklyHours, isVenueOpen, getTodayHours } from '@/lib/utils'

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

    const filteredRestrooms = (venue.restrooms || []).filter(
      (r: { status: string }) => r.status !== 'verified_absent'
    )

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

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
  const weeklyHours = getFormattedWeeklyHours(venue.hours_json)

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
        {/* Venue Hero */}
        <div className="bg-white p-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">
              {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji || '📍'}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
              <p className="text-gray-600 mt-1">{venue.address}</p>

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
        </div>

        {/* Changing Stations Section */}
        <div className="p-6 bg-white border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Changing Stations ({venue.restrooms.length})
          </h2>

          {/* Verified Section */}
          {verifiedRestrooms.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Verified ({verifiedRestrooms.length})
              </h3>
              <div className="space-y-3">
                {verifiedRestrooms.map((restroom) => (
                  <div
                    key={restroom.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    <div className="p-4">
                      {/* Gender + Privacy chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-sm font-medium">
                          {GENDER_CONFIG[restroom.gender].emoji} {GENDER_CONFIG[restroom.gender].label}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-full text-sm">
                          {STATION_LOCATION_CONFIG[restroom.station_location].emoji}{' '}
                          {STATION_LOCATION_CONFIG[restroom.station_location].label}
                        </span>
                      </div>

                      {/* Verification status */}
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Station confirmed
                      </p>

                      {/* Location notes */}
                      {restroom.restroom_location_text && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                          📍 {restroom.restroom_location_text}
                        </p>
                      )}

                      {/* Tips/safety notes for this restroom */}
                      {restroom.safety_notes && (
                        <p className="text-sm text-amber-700 mt-2 bg-amber-50 rounded-lg px-3 py-2">
                          💡 {restroom.safety_notes}
                        </p>
                      )}
                    </div>

                    {/* Restroom photos */}
                    {restroom.photos && restroom.photos.length > 0 && (
                      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                        <div className="flex gap-2 overflow-x-auto">
                          {restroom.photos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.image_url}
                              alt="Changing station"
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unverified Section */}
          {unverifiedRestrooms.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                Unverified ({unverifiedRestrooms.length})
              </h3>
              <div className="space-y-3">
                {unverifiedRestrooms.map((restroom) => (
                  <div
                    key={restroom.id}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4"
                  >
                    {/* Gender + Privacy chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-600 rounded-full text-sm font-medium">
                        {GENDER_CONFIG[restroom.gender].emoji} {GENDER_CONFIG[restroom.gender].label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full text-sm">
                        {STATION_LOCATION_CONFIG[restroom.station_location].emoji}{' '}
                        {STATION_LOCATION_CONFIG[restroom.station_location].label}
                      </span>
                    </div>

                    {/* Unverified status */}
                    <p className="text-sm text-gray-500 mt-2">
                      ? Needs verification
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No restrooms */}
          {venue.restrooms.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-center">
              No changing station data available yet.
            </div>
          )}
        </div>

        {/* Collapsible Hours */}
        {venue.hours_json && (
          <details className="bg-white border-t border-gray-200 group">
            <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition">
              <span className="font-medium text-gray-900">Hours</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4">
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                {weeklyHours.map(({ day, hours, isToday }) => (
                  <div
                    key={day}
                    className={`flex justify-between px-4 py-2.5 ${isToday ? 'bg-teal-50 rounded-lg' : ''}`}
                  >
                    <span className={`text-sm ${isToday ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>
                      {day}
                      {isToday && (
                        <span className="ml-2 text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      )}
                    </span>
                    <span className={`text-sm ${hours === 'Closed' ? 'text-red-500' : 'text-gray-600'}`}>
                      {hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {/* Collapsible Venue Photos */}
        {venue.photo_urls && venue.photo_urls.length > 0 && (
          <details className="bg-white border-t border-gray-200 group">
            <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition">
              <span className="font-medium text-gray-900">Venue Photos ({venue.photo_urls.length})</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {venue.photo_urls.slice(0, 4).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`${venue.name} photo ${index + 1}`}
                    className="w-full h-28 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          </details>
        )}

        {/* Get Directions Button */}
        <div className="p-6 bg-white border-t border-gray-200">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-lg text-center transition"
          >
            Get Directions
          </a>
        </div>

        {/* Bottom Padding */}
        <div className="h-8" />
      </div>
    </div>
  )
}
