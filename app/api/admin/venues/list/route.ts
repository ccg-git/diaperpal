import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceClient } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  // Require authenticated user
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return authResult.response
  }

  // Use service client to get all venues
  const supabase = getServiceClient()

  try {
    // Get all venues with full restroom details for admin
    const { data: venues, error } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        address,
        venue_type,
        restrooms(
          id,
          gender,
          station_location,
          restroom_location_text,
          status,
          has_safety_concern,
          safety_concern_notes,
          has_cleanliness_issue,
          cleanliness_issue_notes,
          additional_notes,
          safety_notes,
          admin_notes,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching venues:', error)
      return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
    }

    // Transform to include restroom count and full restroom data
    const venuesWithRestrooms = (venues || []).map((venue) => ({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      venue_type: venue.venue_type,
      restroom_count: Array.isArray(venue.restrooms) ? venue.restrooms.length : 0,
      restrooms: Array.isArray(venue.restrooms) ? venue.restrooms : [],
    }))

    return NextResponse.json(venuesWithRestrooms)
  } catch (error) {
    console.error('Error in admin venues list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
