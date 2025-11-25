import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Gender, StationLocation, VerificationStatus } from '@/lib/types'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if we have credentials
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Verify admin password
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD

  // If no admin password is set, deny all access
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    return false
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const password = authHeader.substring(7)
  return password === adminPassword
}

export async function POST(request: NextRequest) {
  // Check if Supabase is configured
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Check that ADMIN_PASSWORD is set in environment variables.' },
      { status: 401 }
    )
  }

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
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating restroom:', insertError)
      return NextResponse.json({ error: 'Failed to create restroom' }, { status: 500 })
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

// GET - List restrooms for a venue
export async function GET(request: NextRequest) {
  // Check if Supabase is configured
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

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
