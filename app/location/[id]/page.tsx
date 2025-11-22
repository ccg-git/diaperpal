import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getLocationDetails(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/locations/${id}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return null
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching location:', error)
    return null
  }
}

async function getPlaceDetails(placeId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/places/${placeId}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return null
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching place details:', error)
    return null
  }
}

function getCurrentOpenStatus(opening_hours: any) {
  if (!opening_hours) return null

  const isOpen = opening_hours.open_now

  if (!opening_hours.periods || opening_hours.periods.length === 0) {
    return { isOpen, text: isOpen ? 'Open' : 'Closed' }
  }

  // Get current day and time
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
  const currentTime = now.getHours() * 100 + now.getMinutes()

  // Find today's hours
  const todayPeriod = opening_hours.periods.find((p: any) => p.open?.day === currentDay)

  if (todayPeriod && todayPeriod.close) {
    const closeTime = todayPeriod.close.time
    const closeHour = Math.floor(parseInt(closeTime) / 100)
    const closeMin = parseInt(closeTime) % 100
    const closeFormatted = `${closeHour > 12 ? closeHour - 12 : closeHour}:${closeMin.toString().padStart(2, '0')} ${closeHour >= 12 ? 'PM' : 'AM'}`

    return {
      isOpen,
      text: isOpen ? `Open · Closes ${closeFormatted}` : `Closed · Opens ${closeFormatted}`
    }
  }

  return { isOpen, text: isOpen ? 'Open' : 'Closed' }
}

function formatBusinessCategory(types: string[]) {
  if (!types || types.length === 0) return null

  // Filter out generic types and get the most specific one
  const exclude = ['point_of_interest', 'establishment', 'food', 'store']
  const filtered = types.filter(t => !exclude.includes(t))

  if (filtered.length === 0) return null

  // Format the type (e.g., "coffee_shop" -> "Coffee shop")
  return filtered[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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

function getPrivacyLevel(facility: any) {
  if (facility.privacy_type === 'private') return '🔒🔒🔒 High Privacy'
  if (facility.privacy_type === 'multi_stall' && facility.station_location === 'accessible_stall') return '🔒🔒 Medium Privacy'
  return '🔒 Low Privacy'
}

function getGenderLabel(gender: string) {
  switch (gender) {
    case 'mens': return '👨 Men\'s Restroom'
    case 'womens': return '👩 Women\'s Restroom'
    case 'all_gender': return '🚻 All-Gender Restroom'
    default: return gender
  }
}

export default async function LocationDetailPage(props: { params: { id: string } }) {
  const params = await Promise.resolve(props.params)
  const location = await getLocationDetails(params.id)

  if (!location) {
    notFound()
  }

  // Fetch Google Places details if we have a place_id (stored as google_place_id in database)
  const placeDetails = location.google_place_id ? await getPlaceDetails(location.google_place_id) : null
  const openStatus = placeDetails?.opening_hours ? getCurrentOpenStatus(placeDetails.opening_hours) : null
  const businessCategory = placeDetails?.types ? formatBusinessCategory(placeDetails.types) : null

  const verifiedFacilities = (location.facilities || []).filter(
    (f: any) => f.verification_status === 'verified_present'
  )

  const unverifiedFacilities = (location.facilities || []).filter(
    (f: any) => f.verification_status === 'unverified'
  )

  const absentFacilities = (location.facilities || []).filter(
    (f: any) => f.verification_status === 'verified_absent'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <Link href="/map" className="inline-block mb-4 text-blue-600 hover:text-blue-700 font-semibold">
          ← Back to List
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-4xl">{getVenueTypeEmoji(location.venue_type)}</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{location.name}</h1>

              {/* Rating and Reviews */}
              {placeDetails?.rating && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold">{placeDetails.rating}</span>
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>
                        {i < Math.floor(placeDetails.rating) ? '⭐' : i < Math.ceil(placeDetails.rating) ? '⭐' : '☆'}
                      </span>
                    ))}
                  </div>
                  {placeDetails.user_ratings_total && (
                    <span className="text-gray-600 text-sm">({placeDetails.user_ratings_total})</span>
                  )}
                </div>
              )}

              {/* Business Category and Accessibility */}
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                {businessCategory && <span>{businessCategory}</span>}
                {businessCategory && placeDetails?.wheelchair_accessible_entrance && <span>·</span>}
                {placeDetails?.wheelchair_accessible_entrance && <span>♿</span>}
                {(businessCategory || placeDetails?.wheelchair_accessible_entrance) && <span>·</span>}
                <span>{location.address}</span>
              </div>

              {/* Open/Closed Status */}
              {openStatus && (
                <div className={`text-sm font-semibold ${openStatus.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {openStatus.text}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {placeDetails?.website && (
              <a
                href={placeDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg text-center transition flex items-center justify-center gap-2"
              >
                🌐 Website
              </a>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg text-center transition flex items-center justify-center gap-2"
            >
              📍 Directions
            </a>
          </div>
        </div>

        {verifiedFacilities.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ✅ Verified Changing Stations
            </h2>

            {verifiedFacilities.map((facility: any) => (
              <div key={facility.id} className="border-b border-gray-200 last:border-0 pb-4 mb-4 last:mb-0">
                <h3 className="font-bold text-lg mb-2">{getGenderLabel(facility.gender)}</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold">Privacy:</span> {getPrivacyLevel(facility)}</div>
                  {facility.station_location && (
                    <div><span className="font-semibold">Location:</span> {facility.station_location === 'open_wall' ? 'Open wall' : 'Inside accessible stall'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {unverifiedFacilities.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">❓ Unverified Restrooms</h2>
            {unverifiedFacilities.map((facility: any) => (
              <div key={facility.id} className="text-sm text-gray-700 mb-2">
                • {getGenderLabel(facility.gender)}
              </div>
            ))}
          </div>
        )}

        {verifiedFacilities.length === 0 && unverifiedFacilities.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            No restroom data available yet.
          </div>
        )}
      </div>
    </div>
  )
}
