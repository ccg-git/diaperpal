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

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const location = await getLocationDetails(params.id)
  
  if (!location) {
    notFound()
  }

  const verifiedFacilities = location.facilities?.filter(
    (f: any) => f.verification_status === 'verified_present'
  ) || []

  const unverifiedFacilities = location.facilities?.filter(
    (f: any) => f.verification_status === 'unverified'
  ) || []

  const absentFacilities = location.facilities?.filter(
    (f: any) => f.verification_status === 'verified_absent'
  ) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        {/* Back Button */}
        <Link href="/map" className="inline-block mb-4 text-blue-600 hover:text-blue-700 font-semibold">
          ← Back to List
        </Link>

        {/* Venue Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-4xl">{getVenueTypeEmoji(location.venue_type)}</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{location.name}</h1>
              <p className="text-gray-600">{location.address}</p>
            </div>
          </div>

          {/* Get Directions Button */}
          
            href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg text-center transition"
          >
            📍 Get Directions
          </a>
        </div>

        {/* Verified Restrooms */}
        {verifiedFacilities.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ✅ Verified Changing Stations ({verifiedFacilities.length})
            </h2>

            {verifiedFacilities.map((facility: any) => (
              <div key={facility.id} className="border-b border-gray-200 last:border-0 pb-4 mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{getGenderLabel(facility.gender)}</h3>
                  <span className="text-sm text-gray-600">
                    {facility.privacy_type === 'private' ? 'Private' : 'Multi-stall'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Privacy:</span>
                    <span>{getPrivacyLevel(facility)}</span>
                  </div>

                  {facility.station_location && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Station Location:</span>
                      <span>
                        {facility.station_location === 'open_wall' ? 'Open wall' : 'Inside accessible/handicap stall'}
                      </span>
                    </div>
                  )}

                  {facility.location_in_venue && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Where in venue:</span>
                      <span>{facility.location_in_venue}</span>
                    </div>
                  )}

                  {/* Issues */}
                  {(facility.safety_concern || facility.cleanliness_issue) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
                      <p className="font-semibold text-yellow-800 mb-1">⚠️ Issues Reported:</p>
                      <ul className="text-yellow-700 text-sm space-y-1">
                        {facility.safety_concern && <li>• Safety concern</li>}
                        {facility.cleanliness_issue && <li>• Cleanliness issue</li>}
                      </ul>
                      {facility.issues && (
                        <p className="text-yellow-700 text-sm mt-2">{facility.issues}</p>
                      )}
                    </div>
                  )}

                  {/* Photos */}
                  {facility.photos && facility.photos.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold mb-2">📸 Photos:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {facility.photos.map((photo: any) => (
                          <img
                            key={photo.id}
                            src={photo.photo_url}
                            alt="Changing station"
                            className="w-full h-40 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(photo.photo_url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Unverified Restrooms */}
        {unverifiedFacilities.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ❓ Unverified Restrooms ({unverifiedFacilities.length})
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              These restrooms haven't been checked yet. Can you verify?
            </p>
            {unverifiedFacilities.map((facility: any) => (
              <div key={facility.id} className="text-sm text-gray-700 mb-2">
                • {getGenderLabel(facility.gender)} - {facility.privacy_type === 'private' ? 'Private' : 'Multi-stall'}
              </div>
            ))}
          </div>
        )}

        {/* Absent Facilities */}
        {absentFacilities.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ❌ No Changing Station ({absentFacilities.length})
            </h2>
            {absentFacilities.map((facility: any) => (
              <div key={facility.id} className="text-sm text-gray-700 mb-2">
                • {getGenderLabel(facility.gender)} - No changing station available
              </div>
            ))}
          </div>
        )}

        {/* No Data */}
        {verifiedFacilities.length === 0 && unverifiedFacilities.length === 0 && absentFacilities.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            No restroom data available yet. Be the first to add info!
          </div>
        )}
      </div>
    </div>
  )
}