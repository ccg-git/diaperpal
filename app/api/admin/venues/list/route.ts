import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: NextRequest) {
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
    // Get all venues with restroom count
    const { data: venues, error } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        address,
        venue_type,
        restrooms(id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching venues:', error)
      return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
    }

    // Transform to include restroom count
    const venuesWithCount = (venues || []).map((venue) => ({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      venue_type: venue.venue_type,
      restroom_count: Array.isArray(venue.restrooms) ? venue.restrooms.length : 0,
    }))

    return NextResponse.json(venuesWithCount)
  } catch (error) {
    console.error('Error in admin venues list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
