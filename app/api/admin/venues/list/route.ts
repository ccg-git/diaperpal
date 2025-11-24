import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Verify admin password
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const password = authHeader.substring(7)
  return password === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
