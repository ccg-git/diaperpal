'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'
import {
  VenueType,
  Gender,
  StationLocation,
  VerificationStatus,
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
} from '@/lib/types'

const libraries: ('places')[] = ['places']

interface RestroomForm {
  gender: Gender
  station_location: StationLocation
  restroom_location_text: string
  status: VerificationStatus
}

interface CreatedRestroom extends RestroomForm {
  id: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // Step tracking
  const [step, setStep] = useState<'venue' | 'restrooms'>('venue')

  // Venue state
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [venueType, setVenueType] = useState<VenueType>('food_drink')
  const [venueId, setVenueId] = useState<string | null>(null)
  const [venueName, setVenueName] = useState('')
  const [venueLoading, setVenueLoading] = useState(false)
  const [venueError, setVenueError] = useState('')

  // Restroom state
  const [restrooms, setRestrooms] = useState<CreatedRestroom[]>([])
  const [restroomForm, setRestroomForm] = useState<RestroomForm>({
    gender: 'mens',
    station_location: 'single_restroom',
    restroom_location_text: '',
    status: 'verified_present',
  })
  const [restroomLoading, setRestroomLoading] = useState(false)
  const [restroomError, setRestroomError] = useState('')

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

  // Check if already authenticated (cookie)
  useEffect(() => {
    const storedPassword = document.cookie
      .split('; ')
      .find((row) => row.startsWith('admin_password='))
      ?.split('=')[1]

    if (storedPassword) {
      setPassword(storedPassword)
      setIsAuthenticated(true)
    }
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    // Store password in cookie for API calls
    document.cookie = `admin_password=${password}; path=/; max-age=86400` // 24 hours
    setIsAuthenticated(true)
    setAuthError('')
  }

  function handleLogout() {
    document.cookie = 'admin_password=; path=/; max-age=0'
    setIsAuthenticated(false)
    setPassword('')
    resetForm()
  }

  function resetForm() {
    setStep('venue')
    setSelectedPlace(null)
    setVenueType('food_drink')
    setVenueId(null)
    setVenueName('')
    setRestrooms([])
    setRestroomForm({
      gender: 'mens',
      station_location: 'single_restroom',
      restroom_location_text: '',
      status: 'verified_present',
    })
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (place && place.place_id) {
      setSelectedPlace(place)
      setVenueError('')
      // Clear input after selection
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }, [])

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedPlace?.place_id) {
      setVenueError('Please select a venue from the autocomplete')
      return
    }

    setVenueLoading(true)
    setVenueError('')

    try {
      const res = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          place_id: selectedPlace.place_id,
          venue_type: venueType,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create venue')
      }

      setVenueId(data.venue_id)
      setVenueName(data.name)
      setStep('restrooms')
    } catch (error) {
      setVenueError(error instanceof Error ? error.message : 'Failed to create venue')
    } finally {
      setVenueLoading(false)
    }
  }

  async function handleAddRestroom(e: React.FormEvent) {
    e.preventDefault()

    if (!venueId) return

    setRestroomLoading(true)
    setRestroomError('')

    try {
      const res = await fetch('/api/admin/restrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          venue_id: venueId,
          ...restroomForm,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create restroom')
      }

      // Add to list
      setRestrooms((prev) => [
        ...prev,
        { ...restroomForm, id: data.restroom_id },
      ])

      // Reset form for next restroom
      setRestroomForm({
        gender: 'mens',
        station_location: 'single_restroom',
        restroom_location_text: '',
        status: 'verified_present',
      })
    } catch (error) {
      setRestroomError(error instanceof Error ? error.message : 'Failed to add restroom')
    } finally {
      setRestroomLoading(false)
    }
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Admin Login
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              autoFocus
            />
            {authError && (
              <p className="text-red-500 text-sm mt-2">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Error loading Google Maps. Please check your API key.
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className={`flex items-center gap-2 ${
              step === 'venue' ? 'text-teal-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'venue'
                  ? 'bg-teal-600 text-white'
                  : venueId
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {venueId ? '✓' : '1'}
            </span>
            <span className="font-medium">Venue</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200" />
          <div
            className={`flex items-center gap-2 ${
              step === 'restrooms' ? 'text-teal-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'restrooms' ? 'bg-teal-600 text-white' : 'bg-gray-200'
              }`}
            >
              2
            </span>
            <span className="font-medium">Restrooms</span>
          </div>
        </div>

        {/* Step 1: Select Venue */}
        {step === 'venue' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Add New Venue
            </h2>

            <form onSubmit={handleCreateVenue}>
              {/* Google Autocomplete */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for venue
                </label>
                <Autocomplete
                  onLoad={onLoad}
                  onPlaceChanged={onPlaceChanged}
                  options={{
                    componentRestrictions: { country: 'us' },
                    types: ['establishment'],
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for a venue..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </Autocomplete>
              </div>

              {/* Selected Place Info */}
              {selectedPlace && (
                <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="font-semibold text-teal-900">{selectedPlace.name}</p>
                  <p className="text-sm text-teal-700">
                    {selectedPlace.formatted_address}
                  </p>
                </div>
              )}

              {/* Venue Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(VENUE_TYPE_CONFIG) as [VenueType, { emoji: string; label: string }][]).map(
                    ([type, config]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setVenueType(type)}
                        className={`py-3 px-4 rounded-lg font-medium text-left transition ${
                          venueType === type
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {config.emoji} {config.label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {venueError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {venueError}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedPlace || venueLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
              >
                {venueLoading ? 'Creating...' : 'Create Venue'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Add Restrooms */}
        {step === 'restrooms' && venueId && (
          <div className="space-y-6">
            {/* Venue Info */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-teal-900">{venueName}</p>
                  <p className="text-sm text-teal-700">
                    {VENUE_TYPE_CONFIG[venueType].emoji} {VENUE_TYPE_CONFIG[venueType].label}
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  + Add Another Venue
                </button>
              </div>
            </div>

            {/* Added Restrooms */}
            {restrooms.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Added Restrooms ({restrooms.length})
                </h3>
                <div className="space-y-2">
                  {restrooms.map((restroom) => (
                    <div
                      key={restroom.id}
                      className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3"
                    >
                      <span className="text-green-600">✓</span>
                      <span>{GENDER_CONFIG[restroom.gender].emoji}</span>
                      <span>{GENDER_CONFIG[restroom.gender].label}</span>
                      <span className="text-gray-400">•</span>
                      <span>{STATION_LOCATION_CONFIG[restroom.station_location].label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Restroom Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Add Restroom
              </h3>

              <form onSubmit={handleAddRestroom}>
                {/* Gender */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(GENDER_CONFIG) as [Gender, { emoji: string; label: string }][]).map(
                      ([gender, config]) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() =>
                            setRestroomForm((prev) => ({ ...prev, gender }))
                          }
                          className={`py-3 px-4 rounded-lg font-medium transition ${
                            restroomForm.gender === gender
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {config.emoji} {config.label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Station Location */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Station Location
                  </label>
                  <div className="space-y-2">
                    {(
                      Object.entries(STATION_LOCATION_CONFIG) as [
                        StationLocation,
                        { emoji: string; label: string; description: string }
                      ][]
                    ).map(([location, config]) => (
                      <button
                        key={location}
                        type="button"
                        onClick={() =>
                          setRestroomForm((prev) => ({
                            ...prev,
                            station_location: location,
                          }))
                        }
                        className={`w-full py-3 px-4 rounded-lg font-medium text-left transition ${
                          restroomForm.station_location === location
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="block">
                          {config.emoji} {config.label}
                        </span>
                        <span
                          className={`text-sm ${
                            restroomForm.station_location === location
                              ? 'text-teal-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {config.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Text */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Description (optional)
                  </label>
                  <input
                    type="text"
                    value={restroomForm.restroom_location_text}
                    onChange={(e) =>
                      setRestroomForm((prev) => ({
                        ...prev,
                        restroom_location_text: e.target.value,
                      }))
                    }
                    placeholder='e.g., "Back hallway near kitchen"'
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>

                {/* Status */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRestroomForm((prev) => ({
                          ...prev,
                          status: 'verified_present',
                        }))
                      }
                      className={`py-3 px-4 rounded-lg font-medium transition ${
                        restroomForm.status === 'verified_present'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ✅ Verified Present
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRestroomForm((prev) => ({
                          ...prev,
                          status: 'unverified',
                        }))
                      }
                      className={`py-3 px-4 rounded-lg font-medium transition ${
                        restroomForm.status === 'unverified'
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ❓ Unverified
                    </button>
                  </div>
                </div>

                {restroomError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    {restroomError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={restroomLoading}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
                >
                  {restroomLoading ? 'Adding...' : 'Add Restroom'}
                </button>
              </form>
            </div>

            {/* Done Button */}
            {restrooms.length > 0 && (
              <button
                onClick={resetForm}
                className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold py-3 rounded-lg transition"
              >
                Done - Add Another Venue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
