'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'

const libraries: ("places")[] = ["places"]

interface Restroom {
  id: string
  privacy_type: 'private' | 'multi_stall' | ''
  gender: 'mens' | 'womens' | 'all_gender' | ''
  location_in_venue: string
  station_status: 'verified_present' | 'verified_absent' | 'unverified' | ''
  station_location: 'open_wall' | 'accessible_stall' | ''
  safety_concern: boolean
  cleanliness_issue: boolean
  issue_notes: string
  additional_notes: string
  photo: File | null
}

export default function AdminPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  const [venueData, setVenueData] = useState({
    name: '',
    address: '',
    lat: null as number | null,
    lng: null as number | null,
    place_id: '',
    venue_type: 'food_drink',
  })

  const [restrooms, setRestrooms] = useState<Restroom[]>([
    {
      id: '1',
      privacy_type: '',
      gender: '',
      location_in_venue: '',
      station_status: '',
      station_location: '',
      safety_concern: false,
      cleanliness_issue: false,
      issue_notes: '',
      additional_notes: '',
      photo: null,
    },
  ])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Add custom styles for Google Autocomplete dropdown
  useEffect(() => {
    const styleId = 'google-autocomplete-styles'

    // Check if styles are already injected
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.innerHTML = `
      .pac-container {
        font-family: inherit !important;
        font-size: 16px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
        margin-top: 4px !important;
        z-index: 9999 !important;
        width: auto !important;
        min-width: 400px !important;
        max-width: none !important;
      }
      .pac-item {
        padding: 12px 16px !important;
        cursor: pointer !important;
        border-top: 1px solid #e5e7eb !important;
        line-height: 1.5 !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow: visible !important;
        text-overflow: clip !important;
        height: auto !important;
        min-height: 50px !important;
      }
      .pac-item:first-child {
        border-top: none !important;
      }
      .pac-item:hover {
        background-color: #f3f4f6 !important;
      }
      .pac-item-query {
        font-size: 16px !important;
        font-weight: 600 !important;
        color: #1f2937 !important;
        display: block !important;
        margin-bottom: 4px !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow: visible !important;
        text-overflow: clip !important;
        max-width: none !important;
        width: 100% !important;
      }
      .pac-matched {
        font-weight: 700 !important;
        color: #2563eb !important;
      }
      .pac-item-query + span,
      .pac-item span:not(.pac-item-query):not(.pac-matched) {
        font-size: 14px !important;
        color: #6b7280 !important;
        display: block !important;
        line-height: 1.5 !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        margin-top: 2px !important;
        overflow: visible !important;
        text-overflow: clip !important;
        max-width: none !important;
        width: 100% !important;
      }
      .pac-item span {
        white-space: normal !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow: visible !important;
        text-overflow: clip !important;
        max-width: none !important;
      }
      .pac-icon {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    // Cleanup function to remove styles when component unmounts
    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      
      if (place.geometry?.location && place.place_id) {
        setVenueData(prev => ({
          ...prev,
          name: place.name || '',
          address: place.formatted_address || '',
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
          place_id: place.place_id,
        }))
        setMessage('✅ Venue selected!')
        setTimeout(() => setMessage(''), 2000)
      }
    }
  }, [])

  function handleVenueChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target
    setVenueData(prev => ({ ...prev, [name]: value }))
  }

  function handleRestroomChange(id: string, field: string, value: any) {
    setRestrooms(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  function addRestroom() {
    const newId = (restrooms.length + 1).toString()
    setRestrooms(prev => [
      ...prev,
      {
        id: newId,
        privacy_type: '',
        gender: '',
        location_in_venue: '',
        station_status: '',
        station_location: '',
        safety_concern: false,
        cleanliness_issue: false,
        issue_notes: '',
        additional_notes: '',
        photo: null,
      },
    ])
  }

  function removeRestroom(id: string) {
    if (restrooms.length > 1) {
      setRestrooms(prev => prev.filter(r => r.id !== id))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!venueData.lat || !venueData.lng) {
      setMessage('❌ Please select a venue from the dropdown')
      return
    }

    if (!venueData.name || !venueData.address) {
      setMessage('❌ Venue information incomplete')
      return
    }

    const validRestrooms = restrooms.filter(r => r.privacy_type && r.gender && r.station_status)
    if (validRestrooms.length === 0) {
      setMessage('❌ Please fill in at least one restroom')
      return
    }

    setLoading(true)

    try {
      const venueResponse = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: venueData.name,
          address: venueData.address,
          lat: venueData.lat,
          lng: venueData.lng,
          place_id: venueData.place_id,
          venue_type: venueData.venue_type,
        }),
      })

      if (!venueResponse.ok) {
        throw new Error('Failed to create venue')
      }

      const { venue_id } = await venueResponse.json()

      for (const restroom of validRestrooms) {
        const facilityResponse = await fetch('/api/facilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venue_id,
            privacy_type: restroom.privacy_type,
            gender: restroom.gender,
            location_in_venue: restroom.location_in_venue,
            station_status: restroom.station_status,
            station_location: restroom.station_location,
            safety_concern: restroom.safety_concern,
            cleanliness_issue: restroom.cleanliness_issue,
            issue_notes: restroom.issue_notes,
            additional_notes: restroom.additional_notes,
          }),
        })

        if (!facilityResponse.ok) {
          console.error('Failed to create facility:', await facilityResponse.text())
          continue
        }

        const { facility_id } = await facilityResponse.json()

        if (restroom.photo) {
          const formData = new FormData()
          formData.append('file', restroom.photo)
          formData.append('facility_id', facility_id)
          formData.append('photo_type', 'station_view')
          formData.append('file_name', `${facility_id}_${Date.now()}.${restroom.photo.name.split('.').pop()}`)

          await fetch('/api/photos', {
            method: 'POST',
            body: formData,
          })
        }
      }

      setMessage('🎉 Success! Venue and restrooms added!')

      setVenueData({
        name: '',
        address: '',
        lat: null,
        lng: null,
        place_id: '',
        venue_type: 'food_drink',
      })
      setRestrooms([
        {
          id: '1',
          privacy_type: '',
          gender: '',
          location_in_venue: '',
          station_status: '',
          station_location: '',
          safety_concern: false,
          cleanliness_issue: false,
          issue_notes: '',
          additional_notes: '',
          photo: null,
        },
      ])
    } catch (error) {
      console.error('Submit error:', error)
      setMessage('❌ Failed to submit. Check console for errors.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading Google Maps...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-blue-600 mb-2">Quick Data Capture</h1>
        <p className="text-gray-600 text-sm mb-6">Add venue + restrooms in the wild</p>

        {message && (
          <div
            className={`mb-4 p-3 rounded text-center font-semibold text-sm ${
              message.includes('🎉') || message.includes('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* VENUE INFO */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-3">Venue Info</h2>

            <div>
              <label className="block text-sm font-semibold mb-1">Search Venue *</label>
              <Autocomplete
                onLoad={onLoad}
                onPlaceChanged={onPlaceChanged}
                options={{
                  types: ['establishment'],
                  componentRestrictions: { country: 'us' },
                }}
              >
                <input
                  type="text"
                  placeholder="Type venue name or address..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg focus:border-blue-500 focus:outline-none"
                  style={{ fontSize: '16px' }}
                />
              </Autocomplete>
              {venueData.name && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-bold text-green-800">{venueData.name}</p>
                  <p className="text-sm text-green-700">{venueData.address}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Venue Type *</label>
              <select
                name="venue_type"
                value={venueData.venue_type}
                onChange={handleVenueChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base"
              >
                <option value="food_drink">☕ Food & Drink</option>
                <option value="shopping">🛍️ Shopping</option>
                <option value="parks_outdoors">🌳 Parks & Outdoors</option>
                <option value="family_attractions">🎨 Family Attractions</option>
                <option value="errands">📋 Errands</option>
              </select>
            </div>
          </div>

          {/* RESTROOMS */}
          {restrooms.map((restroom, index) => (
            <div key={restroom.id} className="border-b pb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Restroom {index + 1}</h2>
                {restrooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRestroom(restroom.id)}
                    className="text-red-600 text-sm font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Privacy Type */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Restroom Privacy *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`privacy_${restroom.id}`}
                        value="private"
                        checked={restroom.privacy_type === 'private'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'privacy_type', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">Private</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`privacy_${restroom.id}`}
                        value="multi_stall"
                        checked={restroom.privacy_type === 'multi_stall'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'privacy_type', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">Multi-stall</span>
                    </label>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Gender *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`gender_${restroom.id}`}
                        value="mens"
                        checked={restroom.gender === 'mens'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'gender', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">Men's</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`gender_${restroom.id}`}
                        value="womens"
                        checked={restroom.gender === 'womens'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'gender', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">Women's</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`gender_${restroom.id}`}
                        value="all_gender"
                        checked={restroom.gender === 'all_gender'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'gender', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">All-gender</span>
                    </label>
                  </div>
                </div>

                {/* Location in Venue */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Location in Venue</label>
                  <input
                    type="text"
                    value={restroom.location_in_venue}
                    onChange={(e) => handleRestroomChange(restroom.id, 'location_in_venue', e.target.value)}
                    placeholder="e.g. Front entrance, Back near electronics"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                  />
                </div>

                {/* Station Status */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Station Status *</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`status_${restroom.id}`}
                        value="verified_present"
                        checked={restroom.station_status === 'verified_present'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'station_status', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">Verified Present</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`status_${restroom.id}`}
                        value="verified_absent"
                        checked={restroom.station_status === 'verified_absent'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'station_status', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">Verified Absent</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`status_${restroom.id}`}
                        value="unverified"
                        checked={restroom.station_status === 'unverified'}
                        onChange={(e) => handleRestroomChange(restroom.id, 'station_status', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-base">Unverified</span>
                    </label>
                  </div>
                </div>

                {/* Station Details (only if Verified Present) */}
                {restroom.station_status === 'verified_present' && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Station Location *</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`location_${restroom.id}`}
                            value="open_wall"
                            checked={restroom.station_location === 'open_wall'}
                            onChange={(e) => handleRestroomChange(restroom.id, 'station_location', e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-base">Open wall</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`location_${restroom.id}`}
                            value="accessible_stall"
                            checked={restroom.station_location === 'accessible_stall'}
                            onChange={(e) => handleRestroomChange(restroom.id, 'station_location', e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-base">Inside accessible/handicap stall</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Issues (optional)</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={restroom.safety_concern}
                            onChange={(e) => handleRestroomChange(restroom.id, 'safety_concern', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-base">Safety concern</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={restroom.cleanliness_issue}
                            onChange={(e) => handleRestroomChange(restroom.id, 'cleanliness_issue', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-base">Cleanliness issue</span>
                        </label>
                      </div>
                    </div>

                    {(restroom.safety_concern || restroom.cleanliness_issue) && (
                      <div>
                        <label className="block text-sm font-semibold mb-1">Issue Notes</label>
                        <textarea
                          value={restroom.issue_notes}
                          onChange={(e) => handleRestroomChange(restroom.id, 'issue_notes', e.target.value)}
                          placeholder="Describe the specific issues..."
                          className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                          rows={2}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold mb-1">Additional Notes</label>
                      <textarea
                        value={restroom.additional_notes}
                        onChange={(e) => handleRestroomChange(restroom.id, 'additional_notes', e.target.value)}
                        placeholder="Any other observations..."
                        className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Photo (optional)</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('File too large. Max 5MB.')
                              return
                            }
                            handleRestroomChange(restroom.id, 'photo', file)
                          }
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      {restroom.photo && (
                        <p className="text-xs text-green-600 mt-1">✓ {restroom.photo.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Another Restroom Button */}
          <button
            type="button"
            onClick={addRestroom}
            className="w-full border-2 border-dashed border-gray-300 text-gray-600 font-semibold py-3 rounded hover:border-blue-400 hover:text-blue-600 transition text-base"
          >
            + Add Another Restroom
          </button>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !venueData.lat || !venueData.lng}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-lg text-lg"
          >
            {loading ? '⏳ Submitting...' : '✅ Submit All'}
          </button>
        </form>
      </div>
    </div>
  )
}