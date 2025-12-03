import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/public-api'

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase()
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
    const { data, error } = await supabase.rpc('find_nearby_stations', {
      user_lat: parseFloat(lat),
      user_lng: parseFloat(lng),
      radius_km: parseFloat(radius),
    })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json([])
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase()
  try {
    const body = await request.json()
    const {
      name,
      address,
      venue_type,
      lat,
      lng,
      facility_type,
      verification_status,
      privacy_level,
      cleanliness_rating,
      strap_condition,
      safety_rating,
      issues,
    } = body

    if (!name || !address || lat === null || lng === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .insert({
        name,
        address,
        venue_type,
        lat,
        lng,
        coordinates: `POINT(${lng} ${lat})`,
      })
      .select()

    if (venueError) {
      console.error('Venue insert error:', venueError)
      return NextResponse.json(
        { error: 'Failed to create venue' },
        { status: 500 }
      )
    }

    const venueId = venueData[0].id

    const { data: facilityData, error: facilityError } = await supabase
      .from('facilities')
      .insert({
        venue_id: venueId,
        facility_type,
        verification_status,
        privacy_level,
        cleanliness_rating,
        strap_condition,
        safety_rating,
        issues,
        verified_by: 'founder',
        verified_at: new Date().toISOString(),
      })
      .select()

    if (facilityError) {
      console.error('Facility insert error:', facilityError)
      return NextResponse.json(
        { error: 'Failed to create facility' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        venue_id: venueId,
        facility_id: facilityData[0].id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}