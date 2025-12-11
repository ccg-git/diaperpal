'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api'
import { Session, User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase-auth'
import {
  VenueType,
  Gender,
  StationLocation,
  VerificationStatus,
  VENUE_TYPE_CONFIG,
  GENDER_CONFIG,
  STATION_LOCATION_CONFIG,
  STATUS_CONFIG,
} from '@/lib/types'

const libraries: ('places')[] = ['places']

// Lazy-initialize Supabase client to avoid build-time errors
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient()
  }
  return supabaseInstance
}

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
  clicksBySource: { list: number; map: number; detail: number }
  recentVenues: { id: string; name: string; venue_type: VenueType }[]
}

interface ExistingRestroom {
  id: string
  gender: Gender
  station_location: StationLocation
  restroom_location_text: string | null
  status: VerificationStatus
  has_safety_concern: boolean
  safety_concern_notes: string | null
  has_cleanliness_issue: boolean
  cleanliness_issue_notes: string | null
  additional_notes: string | null
  safety_notes: string | null
  admin_notes: string | null
  created_at: string
}

interface ExistingVenue {
  id: string
  name: string
  address: string
  venue_type: VenueType
  restroom_count: number
  restrooms: ExistingRestroom[]
}

type ActiveTab = 'add-venue' | 'add-restroom' | 'browse'

export default function AdminPage() {
  // Auth state
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  // Login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

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

  // Browse tab - search and expand state
  const [venueSearch, setVenueSearch] = useState('')
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null)

  // Edit venue state
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null)
  const [editVenueType, setEditVenueType] = useState<VenueType>('food_drink')
  const [editVenueLoading, setEditVenueLoading] = useState(false)

  // Delete venue state
  const [deleteVenueConfirm, setDeleteVenueConfirm] = useState<ExistingVenue | null>(null)
  const [deleteVenueLoading, setDeleteVenueLoading] = useState(false)

  // Edit restroom state
  const [editingRestroomId, setEditingRestroomId] = useState<string | null>(null)
  const [editRestroomForm, setEditRestroomForm] = useState<RestroomForm>({
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
  const [editRestroomLoading, setEditRestroomLoading] = useState(false)

  // Delete restroom state
  const [deleteRestroomConfirm, setDeleteRestroomConfirm] = useState<{ restroom: ExistingRestroom; venueName: string } | null>(null)
  const [deleteRestroomLoading, setDeleteRestroomLoading] = useState(false)

  // Add restroom to specific venue (from browse tab)
  const [addRestroomToVenueId, setAddRestroomToVenueId] = useState<string | null>(null)

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

  // Initialize auth state and listen for changes
  useEffect(() => {
    const supabase = getSupabase()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Get access token for API calls
  function getAccessToken(): string | null {
    return session?.access_token ?? null
  }

  // Fetch stats and venues when authenticated
  useEffect(() => {
    if (session) {
      fetchStats()
      fetchExistingVenues()
    }
  }, [session])

  async function fetchStats() {
    const token = getAccessToken()
    if (!token) return

    setStatsLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
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
    const token = getAccessToken()
    if (!token) return

    setVenuesLoading(true)
    try {
      const res = await fetch('/api/admin/venues/list', {
        headers: { Authorization: `Bearer ${token}` },
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setAuthError('')

    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setAuthError(error.message)
      setLoginLoading(false)
      return
    }

    // Session will be set by the onAuthStateChange listener
    setPassword('')
    setLoginLoading(false)
  }

  async function handleLogout() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setSession(null)
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

    const token = getAccessToken()
    if (!token) {
      setVenueError('Not authenticated')
      return
    }

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
          Authorization: `Bearer ${token}`,
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

    const token = getAccessToken()
    if (!token) {
      setRestroomError('Not authenticated')
      return
    }

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
          Authorization: `Bearer ${token}`,
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

  // Edit venue handler
  async function handleEditVenue(venueId: string) {
    const token = getAccessToken()
    if (!token) return

    setEditVenueLoading(true)
    try {
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ venue_type: editVenueType }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update venue')

      // Update local state
      setExistingVenues((prev) =>
        prev.map((v) =>
          v.id === venueId ? { ...v, venue_type: editVenueType } : v
        )
      )
      setEditingVenueId(null)
      fetchStats()
    } catch (error) {
      console.error('Error updating venue:', error)
      alert(error instanceof Error ? error.message : 'Failed to update venue')
    } finally {
      setEditVenueLoading(false)
    }
  }

  // Delete venue handler
  async function handleDeleteVenue(venue: ExistingVenue) {
    const token = getAccessToken()
    if (!token) return

    setDeleteVenueLoading(true)
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete venue')

      // Update local state
      setExistingVenues((prev) => prev.filter((v) => v.id !== venue.id))
      setDeleteVenueConfirm(null)
      setExpandedVenueId(null)
      fetchStats()
    } catch (error) {
      console.error('Error deleting venue:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete venue')
    } finally {
      setDeleteVenueLoading(false)
    }
  }

  // Start editing restroom
  function startEditRestroom(restroom: ExistingRestroom) {
    setEditingRestroomId(restroom.id)
    setEditRestroomForm({
      gender: restroom.gender,
      station_location: restroom.station_location,
      restroom_location_text: restroom.restroom_location_text || '',
      status: restroom.status,
      has_safety_concern: restroom.has_safety_concern || false,
      safety_concern_notes: restroom.safety_concern_notes || '',
      has_cleanliness_issue: restroom.has_cleanliness_issue || false,
      cleanliness_issue_notes: restroom.cleanliness_issue_notes || '',
      additional_notes: restroom.additional_notes || '',
    })
  }

  // Edit restroom handler
  async function handleEditRestroom(restroomId: string) {
    const token = getAccessToken()
    if (!token) return

    setEditRestroomLoading(true)
    try {
      const res = await fetch(`/api/admin/restrooms/${restroomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gender: editRestroomForm.gender,
          station_location: editRestroomForm.station_location,
          restroom_location_text: editRestroomForm.restroom_location_text || null,
          status: editRestroomForm.status,
          has_safety_concern: editRestroomForm.has_safety_concern,
          has_cleanliness_issue: editRestroomForm.has_cleanliness_issue,
          admin_notes: editRestroomForm.additional_notes || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update restroom')

      // Update local state
      setExistingVenues((prev) =>
        prev.map((venue) => ({
          ...venue,
          restrooms: venue.restrooms.map((r) =>
            r.id === restroomId
              ? {
                  ...r,
                  gender: editRestroomForm.gender,
                  station_location: editRestroomForm.station_location,
                  restroom_location_text: editRestroomForm.restroom_location_text || null,
                  status: editRestroomForm.status,
                  has_safety_concern: editRestroomForm.has_safety_concern,
                  has_cleanliness_issue: editRestroomForm.has_cleanliness_issue,
                  additional_notes: editRestroomForm.additional_notes || null,
                }
              : r
          ),
        }))
      )
      setEditingRestroomId(null)
      fetchStats()
    } catch (error) {
      console.error('Error updating restroom:', error)
      alert(error instanceof Error ? error.message : 'Failed to update restroom')
    } finally {
      setEditRestroomLoading(false)
    }
  }

  // Delete restroom handler
  async function handleDeleteRestroom(restroomId: string) {
    const token = getAccessToken()
    if (!token) return

    setDeleteRestroomLoading(true)
    try {
      const res = await fetch(`/api/admin/restrooms/${restroomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete restroom')

      // Update local state
      setExistingVenues((prev) =>
        prev.map((venue) => ({
          ...venue,
          restrooms: venue.restrooms.filter((r) => r.id !== restroomId),
          restroom_count: venue.restrooms.filter((r) => r.id !== restroomId).length,
        }))
      )
      setDeleteRestroomConfirm(null)
      fetchStats()
    } catch (error) {
      console.error('Error deleting restroom:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete restroom')
    } finally {
      setDeleteRestroomLoading(false)
    }
  }

  // Filter venues by search
  const filteredVenues = existingVenues.filter((venue) =>
    venue.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    venue.address.toLowerCase().includes(venueSearch.toLowerCase())
  )

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // Login screen - show if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <span className="text-4xl">🍼</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in with your admin account</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                autoFocus
                required
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                required
              />
            </div>
            {authError && (
              <p className="text-red-500 text-sm mb-4">{authError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-700">{session.user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Sign out
            </button>
          </div>
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
            {stats?.clicksBySource && (
              <div className="flex justify-center gap-3 mt-2 text-xs text-gray-500">
                <span>List: {stats.clicksBySource.list}</span>
                <span>Map: {stats.clicksBySource.map}</span>
                <span>Detail: {stats.clicksBySource.detail}</span>
              </div>
            )}
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
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <input
                type="text"
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                placeholder="Search venues by name or address..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                Showing {filteredVenues.length} of {existingVenues.length} venues
              </p>
            </div>

            {/* Venues List */}
            {venuesLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : filteredVenues.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500">
                  {existingVenues.length === 0 ? 'No venues yet.' : 'No venues match your search.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className={`bg-white rounded-xl shadow-sm border transition ${
                      expandedVenueId === venue.id ? 'border-teal-400' : 'border-gray-200'
                    }`}
                  >
                    {/* Venue Header */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedVenueId(expandedVenueId === venue.id ? null : venue.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{venue.name}</p>
                            <span className="text-gray-400">
                              {expandedVenueId === venue.id ? '▲' : '▼'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{venue.address}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {VENUE_TYPE_CONFIG[venue.venue_type]?.emoji}{' '}
                              {VENUE_TYPE_CONFIG[venue.venue_type]?.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {venue.restroom_count} station{venue.restroom_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <a
                          href={`/location/${venue.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          View →
                        </a>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedVenueId === venue.id && (
                      <div className="border-t border-gray-200 p-4">
                        {/* Venue Actions */}
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                          {editingVenueId === venue.id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-gray-600">Type:</span>
                              {(Object.entries(VENUE_TYPE_CONFIG) as [VenueType, { emoji: string; label: string }][]).map(
                                ([type, config]) => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => setEditVenueType(type)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                      editVenueType === type
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {config.emoji} {config.label}
                                  </button>
                                )
                              )}
                              <button
                                onClick={() => handleEditVenue(venue.id)}
                                disabled={editVenueLoading}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
                              >
                                {editVenueLoading ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingVenueId(null)}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingVenueId(venue.id)
                                  setEditVenueType(venue.venue_type)
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                              >
                                Edit Venue Type
                              </button>
                              <button
                                onClick={() => setDeleteVenueConfirm(venue)}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
                              >
                                Delete Venue
                              </button>
                            </>
                          )}
                        </div>

                        {/* Stations List */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Changing Stations ({venue.restrooms.length})
                          </h4>
                          {venue.restrooms.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No stations added yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {venue.restrooms.map((restroom) => (
                                <div
                                  key={restroom.id}
                                  className="p-3 bg-gray-50 rounded-lg"
                                >
                                  {editingRestroomId === restroom.id ? (
                                    /* Edit Restroom Form */
                                    <div className="space-y-3">
                                      {/* Gender */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                                        <div className="flex gap-2">
                                          {(Object.entries(GENDER_CONFIG) as [Gender, { emoji: string; label: string }][]).map(
                                            ([gender, config]) => (
                                              <button
                                                key={gender}
                                                type="button"
                                                onClick={() => setEditRestroomForm((prev) => ({ ...prev, gender }))}
                                                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                                  editRestroomForm.gender === gender
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                              >
                                                {config.emoji} {config.label}
                                              </button>
                                            )
                                          )}
                                        </div>
                                      </div>
                                      {/* Station Location */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Station Location</label>
                                        <div className="flex gap-2 flex-wrap">
                                          {(Object.entries(STATION_LOCATION_CONFIG) as [StationLocation, { emoji: string; label: string }][]).map(
                                            ([location, config]) => (
                                              <button
                                                key={location}
                                                type="button"
                                                onClick={() => setEditRestroomForm((prev) => ({ ...prev, station_location: location }))}
                                                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                                  editRestroomForm.station_location === location
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                              >
                                                {config.emoji} {config.label}
                                              </button>
                                            )
                                          )}
                                        </div>
                                      </div>
                                      {/* Status */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setEditRestroomForm((prev) => ({ ...prev, status: 'verified_present' }))}
                                            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                              editRestroomForm.status === 'verified_present'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                          >
                                            ✅ Verified
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditRestroomForm((prev) => ({ ...prev, status: 'unverified' }))}
                                            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                              editRestroomForm.status === 'unverified'
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                          >
                                            ❓ Unverified
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditRestroomForm((prev) => ({ ...prev, status: 'verified_absent' }))}
                                            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                              editRestroomForm.status === 'verified_absent'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                          >
                                            ❌ Absent
                                          </button>
                                        </div>
                                      </div>
                                      {/* Location Text */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Location Description</label>
                                        <input
                                          type="text"
                                          value={editRestroomForm.restroom_location_text}
                                          onChange={(e) => setEditRestroomForm((prev) => ({ ...prev, restroom_location_text: e.target.value }))}
                                          placeholder="e.g., Back hallway near kitchen"
                                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                        />
                                      </div>
                                      {/* Notes */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                        <input
                                          type="text"
                                          value={editRestroomForm.additional_notes}
                                          onChange={(e) => setEditRestroomForm((prev) => ({ ...prev, additional_notes: e.target.value }))}
                                          placeholder="e.g., Ask for key at counter"
                                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                        />
                                      </div>
                                      {/* Checkboxes */}
                                      <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={editRestroomForm.has_safety_concern}
                                            onChange={(e) => setEditRestroomForm((prev) => ({ ...prev, has_safety_concern: e.target.checked }))}
                                            className="w-4 h-4 text-amber-500 border-gray-300 rounded"
                                          />
                                          Safety Concern
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={editRestroomForm.has_cleanliness_issue}
                                            onChange={(e) => setEditRestroomForm((prev) => ({ ...prev, has_cleanliness_issue: e.target.checked }))}
                                            className="w-4 h-4 text-amber-500 border-gray-300 rounded"
                                          />
                                          Cleanliness Issue
                                        </label>
                                      </div>
                                      {/* Action Buttons */}
                                      <div className="flex gap-2 pt-2">
                                        <button
                                          onClick={() => handleEditRestroom(restroom.id)}
                                          disabled={editRestroomLoading}
                                          className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                          {editRestroomLoading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                          onClick={() => setEditingRestroomId(null)}
                                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Restroom Display */
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="text-lg">
                                          {GENDER_CONFIG[restroom.gender]?.emoji}
                                        </span>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                              {GENDER_CONFIG[restroom.gender]?.label}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              restroom.status === 'verified_present'
                                                ? 'bg-green-100 text-green-700'
                                                : restroom.status === 'unverified'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {STATUS_CONFIG[restroom.status]?.emoji} {STATUS_CONFIG[restroom.status]?.label}
                                            </span>
                                            {restroom.has_safety_concern && (
                                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">⚠️ Safety</span>
                                            )}
                                            {restroom.has_cleanliness_issue && (
                                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">🧹 Cleanliness</span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            {STATION_LOCATION_CONFIG[restroom.station_location]?.label}
                                            {restroom.restroom_location_text && ` · ${restroom.restroom_location_text}`}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => startEditRestroom(restroom)}
                                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => setDeleteRestroomConfirm({ restroom, venueName: venue.name })}
                                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Station Button */}
                        {addRestroomToVenueId === venue.id ? (
                          <div className="border-t border-gray-200 pt-4">
                            <RestroomFormComponent
                              restroomForm={restroomForm}
                              setRestroomForm={setRestroomForm}
                              handleAddRestroom={async (e) => {
                                e.preventDefault()
                                const token = getAccessToken()
                                if (!token) return

                                setRestroomLoading(true)
                                setRestroomError('')
                                try {
                                  const res = await fetch('/api/admin/restrooms', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      venue_id: venue.id,
                                      ...restroomForm,
                                    }),
                                  })
                                  const data = await res.json()
                                  if (!res.ok) throw new Error(data.error || 'Failed to create restroom')

                                  // Refresh venues list to get updated data
                                  fetchExistingVenues()
                                  fetchStats()
                                  setAddRestroomToVenueId(null)
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
                                } catch (error) {
                                  setRestroomError(error instanceof Error ? error.message : 'Failed to add restroom')
                                } finally {
                                  setRestroomLoading(false)
                                }
                              }}
                              restroomLoading={restroomLoading}
                              restroomError={restroomError}
                              restroomSuccess={false}
                              restrooms={[]}
                            />
                            <button
                              onClick={() => setAddRestroomToVenueId(null)}
                              className="w-full mt-2 py-2 text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddRestroomToVenueId(venue.id)
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
                            }}
                            className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-teal-400 hover:text-teal-600 transition text-sm font-medium"
                          >
                            + Add Station to {venue.name}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Delete Venue Confirmation Modal */}
            {deleteVenueConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 max-w-md w-full">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Venue?</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete <strong>{deleteVenueConfirm.name}</strong>?
                    {deleteVenueConfirm.restroom_count > 0 && (
                      <span className="block mt-2 text-red-600">
                        This will also delete {deleteVenueConfirm.restroom_count} changing station
                        {deleteVenueConfirm.restroom_count !== 1 ? 's' : ''}.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDeleteVenue(deleteVenueConfirm)}
                      disabled={deleteVenueLoading}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {deleteVenueLoading ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setDeleteVenueConfirm(null)}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Restroom Confirmation Modal */}
            {deleteRestroomConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 max-w-md w-full">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Station?</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete the{' '}
                    <strong>{GENDER_CONFIG[deleteRestroomConfirm.restroom.gender]?.label}</strong> station
                    from <strong>{deleteRestroomConfirm.venueName}</strong>?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDeleteRestroom(deleteRestroomConfirm.restroom.id)}
                      disabled={deleteRestroomLoading}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {deleteRestroomLoading ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setDeleteRestroomConfirm(null)}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
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
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  setRestroomForm((prev) => ({
                    ...prev,
                    status: 'verified_present',
                  }))
                }
                className={`py-3 px-2 rounded-lg font-medium transition text-sm ${
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
                className={`py-3 px-2 rounded-lg font-medium transition text-sm ${
                  restroomForm.status === 'unverified'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ❓ Unverified
              </button>
              <button
                type="button"
                onClick={() =>
                  setRestroomForm((prev) => ({
                    ...prev,
                    status: 'verified_absent',
                  }))
                }
                className={`py-3 px-2 rounded-lg font-medium transition text-sm ${
                  restroomForm.status === 'verified_absent'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ❌ Verified Absent
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
