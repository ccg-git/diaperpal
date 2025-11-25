import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if we have credentials
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '5'

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing lat/lng parameters' },
      { status: 400 }
    )
  }

  try {
    // Get nearby venues
    const { data: venues, error: venuesError } = await supabase.rpc(
      'find_nearby_venues',
      {
        user_lat: parseFloat(lat),
        user_lng: parseFloat(lng),
        radius_km: parseFloat(radius),
      }
    )

    if (venuesError) {
      console.error('Venues query error:', venuesError)
      // Fallback to simple distance query
      const { data: fallbackVenues, error: fallbackError } = await supabase
        .from('venues')
        .select('*')
        .limit(10)

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }

      // Get facilities for each venue
      const venuesWithFacilities = await Promise.all(
        (fallbackVenues || []).map(async (venue: any) => {
          const { data: facilities } = await supabase
            .from('facilities')
            .select('*')
            .eq('venue_id', venue.id)
            .eq('verification_status', 'verified_present')

          return {
            id: venue.id,
            name: venue.name,
            address: venue.address,
            lat: venue.lat,
            lng: venue.lng,
            distance: 0, // Can't calculate without PostGIS
            venue_type: venue.venue_type,
            facilities: facilities || [],
          }
        })
      )

      return NextResponse.json(venuesWithFacilities)
    }

    return NextResponse.json(venues || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}