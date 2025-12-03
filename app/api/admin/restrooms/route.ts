import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, requireAuth, requireReviewer } from '@/lib/supabase/api'
import { Gender, StationLocation, VerificationStatus } from '@/lib/types'

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthenticatedUser()

  // Check authentication
  const authError = requireAuth(user)
  if (authError) return authError

  // Require reviewer or admin role
  const roleError = requireReviewer(profile)
  if (roleError) return roleError

  try {
    const body = await request.json()
    const {
      venue_id,
      gender,
      station_location,
      restroom_location_text,
      status = 'verified_present',
      safety_notes,
      admin_notes,
    } = body

    // Validate required fields
    if (!venue_id || !gender || !station_location) {
      return NextResponse.json(
        { error: 'venue_id, gender, and station_location are required' },
        { status: 400 }
      )
    }

    // Validate gender
    const validGenders: Gender[] = ['mens', 'womens', 'all_gender']
    if (!validGenders.includes(gender)) {
      return NextResponse.json(
        { error: `Invalid gender. Must be one of: ${validGenders.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate station_location
    const validLocations: StationLocation[] = ['single_restroom', 'inside_stall', 'near_sinks']
    if (!validLocations.includes(station_location)) {
      return NextResponse.json(
        { error: `Invalid station_location. Must be one of: ${validLocations.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses: VerificationStatus[] = ['verified_present', 'verified_absent', 'unverified']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify venue exists
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venue_id)
      .single()

    if (venueError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Create restroom
    const { data: restroom, error: insertError } = await supabase
      .from('restrooms')
      .insert({
        venue_id,
        gender,
        station_location,
        restroom_location_text: restroom_location_text || null,
        status,
        safety_notes: safety_notes || null,
        admin_notes: admin_notes || null,
        verified_at: status === 'verified_present' ? new Date().toISOString() : null,
        verified_by_user_id: user!.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating restroom:', insertError)
      return NextResponse.json({ error: 'Failed to create restroom', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      restroom_id: restroom.id,
      gender: restroom.gender,
      station_location: restroom.station_location,
      status: restroom.status,
    })
  } catch (error) {
    console.error('Error in admin restrooms API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List restrooms for a venue (publicly accessible for viewing)
export async function GET(request: NextRequest) {
  const { supabase } = await getAuthenticatedUser()
  const venueId = request.nextUrl.searchParams.get('venue_id')

  if (!venueId) {
    return NextResponse.json({ error: 'venue_id is required' }, { status: 400 })
  }

  try {
    const { data: restrooms, error } = await supabase
      .from('restrooms')
      .select(`
        *,
        photos:restroom_photos(*)
      `)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching restrooms:', error)
      return NextResponse.json({ error: 'Failed to fetch restrooms' }, { status: 500 })
    }

    return NextResponse.json(restrooms || [])
  } catch (error) {
    console.error('Error in admin restrooms GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
