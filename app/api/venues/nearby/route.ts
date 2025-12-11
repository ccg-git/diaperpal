import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { metersToMiles, formatDistance, isVenueOpen, getTodayHours } from '@/lib/utils'
import { VenueType, Gender, RestroomWithPhotos } from '@/lib/types'

// Prevent static generation - this route requires runtime env vars
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Create client inside handler to avoid build-time initialization errors
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const searchParams = request.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '33.8845')
  const lng = parseFloat(searchParams.get('lng') || '-118.3976')
  const radius = parseFloat(searchParams.get('radius') || '8') // km, default 5 miles
  const venueTypes = searchParams.get('venue_type')?.split(',').filter(Boolean) as VenueType[] | undefined
  const genders = searchParams.get('gender')?.split(',').filter(Boolean) as Gender[] | undefined
  const openNow = searchParams.get('open_now') === 'true'

  try {
    // Call PostGIS function to find nearby venues
    const { data: nearbyVenues, error: venueError } = await supabase
      .rpc('find_nearby_venues', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radius,
      })

    if (venueError) {
      console.error('Error finding nearby venues:', venueError)
      return NextResponse.json({ error: 'Failed to find nearby venues' }, { status: 500 })
    }

    if (!nearbyVenues || nearbyVenues.length === 0) {
      return NextResponse.json([])
    }

    // Get venue IDs for restroom query
    const venueIds = nearbyVenues.map((v: { id: string }) => v.id)

    // Fetch restrooms with photos for all nearby venues
    const { data: restrooms, error: restroomError } = await supabase
      .from('restrooms')
      .select(`
        *,
        photos:restroom_photos(*)
      `)
      .in('venue_id', venueIds)
      .neq('status', 'verified_absent') // Never show verified_absent to users

    if (restroomError) {
      console.error('Error fetching restrooms:', restroomError)
    }

    // Group restrooms by venue_id
    const restroomsByVenue: Record<string, RestroomWithPhotos[]> = {}
    for (const restroom of restrooms || []) {
      if (!restroomsByVenue[restroom.venue_id]) {
        restroomsByVenue[restroom.venue_id] = []
      }
      restroomsByVenue[restroom.venue_id].push(restroom)
    }

    // Build response with filtering
    const results = nearbyVenues
      .map((venue: {
        id: string
        name: string
        address: string
        lat: number
        lng: number
        venue_type: VenueType
        place_id: string
        hours_json: Record<string, { open: string; close: string }> | null
        rating: number | null
        review_count: number | null
        distance_meters: number
      }) => {
        const venueRestrooms = restroomsByVenue[venue.id] || []
        const distanceMiles = metersToMiles(venue.distance_meters)
        const is_open = isVenueOpen(venue.hours_json)
        const hours_today = getTodayHours(venue.hours_json)

        return {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          lat: Number(venue.lat),
          lng: Number(venue.lng),
          venue_type: venue.venue_type,
          distance: distanceMiles,
          distance_display: formatDistance(distanceMiles),
          is_open,
          hours_today,
          rating: venue.rating,
          review_count: venue.review_count,
          restrooms: venueRestrooms,
        }
      })
      // Apply filters
      .filter((venue: { venue_type: VenueType; is_open: boolean; restrooms: RestroomWithPhotos[] }) => {
        // Only show venues that have at least one visible station
        // (verified_present or unverified - verified_absent are already filtered out above)
        if (venue.restrooms.length === 0) return false

        // Venue type filter
        if (venueTypes && venueTypes.length > 0) {
          if (!venueTypes.includes(venue.venue_type)) return false
        }

        // Open now filter
        if (openNow && !venue.is_open) return false

        // Gender filter - venue must have at least one matching restroom
        if (genders && genders.length > 0) {
          const hasMatchingRestroom = venue.restrooms.some(
            (r: RestroomWithPhotos) => genders.includes(r.gender) || r.gender === 'all_gender'
          )
          if (!hasMatchingRestroom) return false
        }

        return true
      })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error in nearby venues API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
