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
  // Issue tracking
  has_safety_concern: boolean
  safety_concern_notes: string
  has_cleanliness_issue: boolean
  cleanliness_issue_notes: string
  // Tips like "ask for key"
  additional_notes: string
}

interface CreatedRestroom extends RestroomForm {
  id: string
}

interface Stats {
  totalVenues: number
  totalRestrooms: number
  totalDirectionClicks: number
  recentVenues: { id: string; name: string; venue_type: VenueType }[]
}

interface ExistingVenue {
  id: string
  name: string
  address: string
  venue_type: VenueType
  restroom_count: number
}

type ActiveTab = 'add-venue' | 'add-restroom' | 'browse'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('add-venue')

  // Stats
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Venue state (Add Venue tab)
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [venueType, setVenueType] = useState<VenueType>('food_drink')
  const [venueId, setVenueId] = useState<string | null>(null)
  const [venueName, setVenueName] = useState('')
  const [venueLoading, setVenueLoading] = useState(false)
  const [venueError, setVenueError] = useState('')
  const [venueSuccess, setVenueSuccess] = useState(false)

  // Existing venues (Add Restroom / Browse tab)
  const [existingVenues, setExistingVenues] = useState<ExistingVenue[]>([])
  const [venuesLoading, setVenuesLoading] = useState(false)
  const [selectedExistingVenue, setSelectedExistingVenue] = useState<ExistingVenue | null>(null)

  // Restroom state
  const [restrooms, setRestrooms] = useState<CreatedRestroom[]>([])
  const [restroomForm, setRestroomForm] = useState<RestroomForm>({
    gender: 'mens',
    station_location: 'single_restroom',
    restroom_location_text: '',
    status: 'verified_present',
    has_safety_concern: false,
    safety_concern_notes: '',
    has_cleanliness_issue: false,
    cleanliness_issue_notes: '',
    additional_notes: '',
  })
  const [restroomLoading, setRestroomLoading] = useState(false)
  const [restroomError, setRestroomError] = useState('')
  const [restroomSuccess, setRestroomSuccess] = useState(false)

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

  // Fetch stats and venues when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
      fetchExistingVenues()
    }
  }, [isAuthenticated])

  async function fetchStats() {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  async function fetchExistingVenues() {
    setVenuesLoading(true)
    try {
      const res = await fetch('/api/admin/venues/list', {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.ok) {
        const data = await res.json()
        setExistingVenues(data)
      }
    } catch (error) {
      console.error('Error fetching venues:', error)
    } finally {
      setVenuesLoading(false)
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    document.cookie = `admin_password=${password}; path=/; max-age=86400`
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
    setSelectedPlace(null)
    setVenueType('food_drink')
    setVenueId(null)
    setVenueName('')
    setVenueSuccess(false)
    setVenueError('')
    setRestrooms([])
    setSelectedExistingVenue(null)
    setRestroomForm({
      gender: 'mens',
      station_location: 'single_restroom',
      restroom_location_text: '',
      status: 'verified_present',
      has_safety_concern: false,
      safety_concern_notes: '',
      has_cleanliness_issue: false,
      cleanliness_issue_notes: '',
      additional_notes: '',
    })
    setRestroomSuccess(false)
    setRestroomError('')
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
    setVenueSuccess(false)

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
      setVenueSuccess(true)
      fetchStats()
      fetchExistingVenues()
    } catch (error) {
      setVenueError(error instanceof Error ? error.message : 'Failed to create venue')
    } finally {
      setVenueLoading(false)
    }
  }

  async function handleAddRestroom(e: React.FormEvent) {
    e.preventDefault()

    const targetVenueId = venueId || selectedExistingVenue?.id
    if (!targetVenueId) return

    setRestroomLoading(true)
    setRestroomError('')
    setRestroomSuccess(false)

    try {
      const res = await fetch('/api/admin/restrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          venue_id: targetVenueId,
          ...restroomForm,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create restroom')
      }

      setRestrooms((prev) => [
        ...prev,
        { ...restroomForm, id: data.restroom_id },
      ])

      setRestroomForm({
        gender: 'mens',
        station_location: 'single_restroom',
        restroom_location_text: '',
        status: 'verified_present',
        has_safety_concern: false,
        safety_concern_notes: '',
        has_cleanliness_issue: false,
        cleanliness_issue_notes: '',
        additional_notes: '',
      })

      setRestroomSuccess(true)
      fetchStats()
      fetchExistingVenues()

      setTimeout(() => setRestroomSuccess(false), 3000)
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
          <div className="text-center mb-6">
            <span className="text-4xl">🍼</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Admin Login</h1>
          </div>
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
            <p className="font-semibold mb-2">Error loading Google Maps</p>
            <p className="text-sm mb-3">Please check that:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in your .env.local file</li>
              <li>The API key has "Maps JavaScript API" and "Places API" enabled</li>
              <li>The API key has no domain restrictions blocking localhost</li>
            </ul>
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
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍼</span>
            <h1 className="text-xl font-bold text-gray-900">DiaperPal Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">
              {statsLoading ? '...' : stats?.totalVenues ?? 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Venues</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">
              {statsLoading ? '...' : stats?.totalRestrooms ?? 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Changing Stations</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-teal-600">
              {statsLoading ? '...' : stats?.totalDirectionClicks ?? 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Direction Clicks</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('add-venue'); resetForm(); }}
            className={`px-4 py-3 font-medium text-sm border-b-2 -mb-px transition ${
              activeTab === 'add-venue'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            + Add Venue
          </button>
          <button
            onClick={() => { setActiveTab('add-restroom'); resetForm(); }}
            className={`px-4 py-3 font-medium text-sm border-b-2 -mb-px transition ${
              activeTab === 'add-restroom'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            + Add Restroom
          </button>
          <button
            onClick={() => { setActiveTab('browse'); resetForm(); }}
            className={`px-4 py-3 font-medium text-sm border-b-2 -mb-px transition ${
              activeTab === 'browse'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse Venues
          </button>
        </div>

        {/* Add Venue Tab */}
        {activeTab === 'add-venue' && (
          <div className="space-y-6">
            {/* Venue Form */}
            {!venueSuccess && (
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

            {/* Success - Add Restrooms */}
            {venueSuccess && venueId && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="font-semibold text-green-900">Venue Created!</p>
                      <p className="text-sm text-green-700">{venueName}</p>
                    </div>
                  </div>
                </div>

                {/* Restroom Form */}
                <RestroomFormComponent
                  restroomForm={restroomForm}
                  setRestroomForm={setRestroomForm}
                  handleAddRestroom={handleAddRestroom}
                  restroomLoading={restroomLoading}
                  restroomError={restroomError}
                  restroomSuccess={restroomSuccess}
                  restrooms={restrooms}
                />

                <button
                  onClick={resetForm}
                  className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold py-3 rounded-lg transition"
                >
                  Done - Add Another Venue
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Restroom to Existing Venue Tab */}
        {activeTab === 'add-restroom' && (
          <div className="space-y-6">
            {!selectedExistingVenue ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Select a Venue
                </h2>
                {venuesLoading ? (
                  <p className="text-gray-500">Loading venues...</p>
                ) : existingVenues.length === 0 ? (
                  <p className="text-gray-500">No venues yet. Add one first!</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {existingVenues.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => setSelectedExistingVenue(venue)}
                        className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{venue.name}</p>
                            <p className="text-sm text-gray-500">
                              {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji} {VENUE_TYPE_CONFIG[venue.venue_type]?.label}
                            </p>
                          </div>
                          <span className="text-sm text-gray-400">
                            {venue.restroom_count} restroom{venue.restroom_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-teal-900">{selectedExistingVenue.name}</p>
                      <p className="text-sm text-teal-700">
                        {VENUE_TYPE_CONFIG[selectedExistingVenue.venue_type]?.emoji}{' '}
                        {VENUE_TYPE_CONFIG[selectedExistingVenue.venue_type]?.label}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedExistingVenue(null)}
                      className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <RestroomFormComponent
                  restroomForm={restroomForm}
                  setRestroomForm={setRestroomForm}
                  handleAddRestroom={handleAddRestroom}
                  restroomLoading={restroomLoading}
                  restroomError={restroomError}
                  restroomSuccess={restroomSuccess}
                  restrooms={restrooms}
                />
              </div>
            )}
          </div>
        )}

        {/* Browse Venues Tab */}
        {activeTab === 'browse' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              All Venues ({existingVenues.length})
            </h2>
            {venuesLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : existingVenues.length === 0 ? (
              <p className="text-gray-500">No venues yet.</p>
            ) : (
              <div className="space-y-3">
                {existingVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{venue.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{venue.address}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji}{' '}
                            {VENUE_TYPE_CONFIG[venue.venue_type]?.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {venue.restroom_count} changing station{venue.restroom_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`/location/${venue.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Restroom Form Component (reused in multiple places)
function RestroomFormComponent({
  restroomForm,
  setRestroomForm,
  handleAddRestroom,
  restroomLoading,
  restroomError,
  restroomSuccess,
  restrooms,
}: {
  restroomForm: RestroomForm
  setRestroomForm: React.Dispatch<React.SetStateAction<RestroomForm>>
  handleAddRestroom: (e: React.FormEvent) => void
  restroomLoading: boolean
  restroomError: string
  restroomSuccess: boolean
  restrooms: CreatedRestroom[]
}) {
  return (
    <>
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

      {/* Success Message */}
      {restroomSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
          ✓ Restroom added successfully!
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

          {/* Safety Concern Checkbox */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <input
                type="checkbox"
                checked={restroomForm.has_safety_concern}
                onChange={(e) =>
                  setRestroomForm((prev) => ({
                    ...prev,
                    has_safety_concern: e.target.checked,
                    safety_concern_notes: e.target.checked ? prev.safety_concern_notes : '',
                  }))
                }
                className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
              />
              <div>
                <span className="font-medium text-gray-900">⚠️ Safety Concern</span>
                <p className="text-xs text-gray-500">Check if there's a safety issue (broken strap, etc.)</p>
              </div>
            </label>
            {restroomForm.has_safety_concern && (
              <textarea
                value={restroomForm.safety_concern_notes}
                onChange={(e) =>
                  setRestroomForm((prev) => ({
                    ...prev,
                    safety_concern_notes: e.target.value,
                  }))
                }
                placeholder="Describe the safety concern..."
                rows={2}
                className="w-full mt-2 px-4 py-3 border border-amber-300 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
              />
            )}
          </div>

          {/* Cleanliness Issue Checkbox */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <input
                type="checkbox"
                checked={restroomForm.has_cleanliness_issue}
                onChange={(e) =>
                  setRestroomForm((prev) => ({
                    ...prev,
                    has_cleanliness_issue: e.target.checked,
                    cleanliness_issue_notes: e.target.checked ? prev.cleanliness_issue_notes : '',
                  }))
                }
                className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
              />
              <div>
                <span className="font-medium text-gray-900">🧹 Cleanliness Issue</span>
                <p className="text-xs text-gray-500">Check if there's a cleanliness problem</p>
              </div>
            </label>
            {restroomForm.has_cleanliness_issue && (
              <textarea
                value={restroomForm.cleanliness_issue_notes}
                onChange={(e) =>
                  setRestroomForm((prev) => ({
                    ...prev,
                    cleanliness_issue_notes: e.target.value,
                  }))
                }
                placeholder="Describe the cleanliness issue..."
                rows={2}
                className="w-full mt-2 px-4 py-3 border border-amber-300 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
              />
            )}
          </div>

          {/* Tips / Notes (Always visible) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💡 Tips / Notes (optional)
            </label>
            <textarea
              value={restroomForm.additional_notes}
              onChange={(e) =>
                setRestroomForm((prev) => ({
                  ...prev,
                  additional_notes: e.target.value,
                }))
              }
              placeholder='e.g., "Ask staff for key" or "Near the back patio"'
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Helpful tips for finding/using the changing station
            </p>
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
    </>
  )
}
