'use client'
import { useState } from 'react'

export default function AdminPage() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    venue_type: 'retail',
    lat: null as number | null,
    lng: null as number | null,
    facility_type: 'family',
    verification_status: 'verified_present',
    privacy_level: 'private',
    cleanliness_rating: 5,
    strap_condition: 'good',
    safety_rating: 'safe',
    issues: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cleanliness_rating' ? parseInt(value) : value
    }))
  }

  async function getGPSLocation() {
    setGpsLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }))
          setGpsLoading(false)
          setMessage('📍 GPS location captured!')
          setTimeout(() => setMessage(''), 2000)
        },
        (error) => {
          console.error('GPS error:', error)
          setMessage('❌ Unable to get GPS location')
          setGpsLoading(false)
        }
      )
    } else {
      setMessage('❌ GPS not supported')
      setGpsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.lat || !formData.lng) {
      setMessage('❌ Please get GPS location first')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        setMessage('✅ Location verified and added!')
        setFormData({
          name: '',
          address: '',
          venue_type: 'retail',
          lat: null,
          lng: null,
          facility_type: 'family',
          verification_status: 'verified_present',
          privacy_level: 'private',
          cleanliness_rating: 5,
          strap_condition: 'good',
          safety_rating: 'safe',
          issues: '',
        })
      } else {
        const error = await response.json()
        setMessage(`❌ Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
      setMessage('❌ Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">Admin: Verify Location</h1>
        <p className="text-gray-600 mb-6">Add a new verified changing station</p>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.includes('✅') || message.includes('📍') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-3">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Venue Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Starbucks, Target"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, State"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Venue Type</label>
                <select
                  name="venue_type"
                  value={formData.venue_type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="retail">Retail</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="park">Park</option>
                  <option value="mall">Mall</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-3">GPS Location *</h2>
            
            <button
              type="button"
              onClick={getGPSLocation}
              disabled={gpsLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded mb-3"
            >
              {gpsLoading ? '📍 Getting location...' : '📍 Get Current GPS Location'}
            </button>
            
            {formData.lat && formData.lng && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                <p className="font-semibold text-green-800">✅ GPS Captured</p>
                <p className="text-green-700">Lat: {formData.lat.toFixed(6)}</p>
                <p className="text-green-700">Lng: {formData.lng.toFixed(6)}</p>
              </div>
            )}
          </div>

          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-3">Facility Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Facility Type *</label>
                <select
                  name="facility_type"
                  value={formData.facility_type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="family">Family Restroom</option>
                  <option value="mens">Men's Restroom</option>
                  <option value="womens">Women's Restroom</option>
                  <option value="allgender">All-Gender Restroom</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Verification Status *</label>
                <select
                  name="verification_status"
                  value={formData.verification_status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="verified_present">✅ Verified Present</option>
                  <option value="verified_absent">❌ Verified Absent</option>
                  <option value="unverified">❓ Unverified</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Privacy Level *</label>
                <select
                  name="privacy_level"
                  value={formData.privacy_level}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="private">🔒 Private (Enclosed room)</option>
                  <option value="semi_private">🚪 Semi-Private (Stall)</option>
                  <option value="exposed">👁️ Exposed (Open area)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Cleanliness Rating *</label>
                <select
                  name="cleanliness_rating"
                  value={formData.cleanliness_rating}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5 - Spotless)</option>
                  <option value="4">⭐⭐⭐⭐ (4 - Clean)</option>
                  <option value="3">⭐⭐⭐ (3 - Acceptable)</option>
                  <option value="2">⭐⭐ (2 - Dirty)</option>
                  <option value="1">⭐ (1 - Avoid)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Strap Condition *</label>
                <select
                  name="strap_condition"
                  value={formData.strap_condition}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="good">✅ Good</option>
                  <option value="dirty">🧼 Dirty</option>
                  <option value="broken">🔧 Broken</option>
                  <option value="missing">❌ Missing</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Safety Rating *</label>
                <select
                  name="safety_rating"
                  value={formData.safety_rating}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="safe">✅ Safe</option>
                  <option value="questionable">⚠️ Questionable</option>
                  <option value="unsafe">❌ Unsafe</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Issues / Notes (optional)</label>
                <textarea
                  name="issues"
                  value={formData.issues}
                  onChange={handleChange}
                  placeholder="Any additional notes or issues..."
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.lat || !formData.lng}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-lg text-lg"
          >
            {loading ? '⏳ Saving...' : '✅ Verify & Add Location'}
          </button>
        </form>
      </div>
    </div>
  )
}