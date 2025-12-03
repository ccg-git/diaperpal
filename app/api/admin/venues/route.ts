import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, requireAuth, requireReviewer } from '@/lib/supabase/api'
import { VenueType } from '@/lib/types'

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser()

  // Check authentication
  const authError = requireAuth(user)
  if (authError) return authError

  // Require reviewer or admin role
  const roleError = requireReviewer(profile)
  if (roleError) return roleError

  try {
    const { place_id, venue_type } = await request.json()

    if (!place_id || !venue_type) {
      return NextResponse.json(
        { error: 'place_id and venue_type are required' },
        { status: 400 }
      )
    }

    // Validate venue_type
    const validTypes: VenueType[] = ['food_drink', 'parks_outdoors', 'indoor_activities', 'errands']
    if (!validTypes.includes(venue_type)) {
      return NextResponse.json(
        { error: `Invalid venue_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch place details from Google Places API
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured. Set GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.' }, { status: 500 })
    }

    const placeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${place_id}&` +
      `fields=name,formatted_address,geometry,opening_hours,rating,user_ratings_total,photos&` +
      `key=${googleApiKey}`
    )

    const placeData = await placeResponse.json()

    if (placeData.status !== 'OK' || !placeData.result) {
      console.error('Google Places API error:', placeData)
      return NextResponse.json(
        { error: `Google Places API error: ${placeData.status}` },
        { status: 400 }
      )
    }

    const place = placeData.result

    // Parse hours
    const hours_json = parseGoogleHours(place.opening_hours?.weekday_text || [])

    // Get photo URLs (up to 5)
    const photo_urls = place.photos?.slice(0, 5).map((p: { photo_reference: string }) =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${googleApiKey}`
    ) || []

    // Create venue in database
    // Note: submitted_by is auto-populated by database trigger using auth.uid()
    const { data: venue, error: insertError } = await supabase
      .from('venues')
      .insert({
        place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        coordinates: `POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`,
        venue_type,
        hours_json,
        rating: place.rating || null,
        review_count: place.user_ratings_total || null,
        photo_urls,
        google_data_refreshed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a duplicate
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Venue with this place_id already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating venue:', insertError)
      return NextResponse.json({ error: 'Failed to create venue', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      venue_id: venue.id,
      name: venue.name,
      address: venue.address,
      google_data_cached: true,
    })
  } catch (error) {
    console.error('Error in admin venues API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Parse Google's weekday_text format into our hours_json format
 */
function parseGoogleHours(weekdayText: string[]): Record<string, { open: string; close: string }> | null {
  if (!weekdayText || weekdayText.length === 0) return null

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const hours: Record<string, { open: string; close: string }> = {}

  weekdayText.forEach((text) => {
    // Format: "Monday: 6:00 AM – 8:00 PM" or "Monday: Closed"
    const colonIndex = text.indexOf(':')
    if (colonIndex === -1) return

    const dayName = text.substring(0, colonIndex).toLowerCase()
    const timeStr = text.substring(colonIndex + 1).trim()

    if (timeStr.toLowerCase() === 'closed') return

    // Match time range: "6:00 AM – 8:00 PM" or "6:00 AM - 8:00 PM"
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (match) {
      let openHour = parseInt(match[1])
      const openMin = match[2]
      const openPeriod = match[3].toUpperCase()

      let closeHour = parseInt(match[4])
      const closeMin = match[5]
      const closePeriod = match[6].toUpperCase()

      // Convert to 24-hour format
      if (openPeriod === 'PM' && openHour !== 12) openHour += 12
      if (openPeriod === 'AM' && openHour === 12) openHour = 0
      if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12
      if (closePeriod === 'AM' && closeHour === 12) closeHour = 0

      if (days.includes(dayName)) {
        hours[dayName] = {
          open: `${String(openHour).padStart(2, '0')}:${openMin}`,
          close: `${String(closeHour).padStart(2, '0')}:${closeMin}`,
        }
      }
    }
  })

  return Object.keys(hours).length > 0 ? hours : null
}
