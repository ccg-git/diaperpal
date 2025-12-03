import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireAuth, requireReviewer } from '@/lib/supabase/api'

export async function GET() {
  const { user, profile, supabase } = await getAuthenticatedUser()

  // Check authentication
  const authError = requireAuth(user)
  if (authError) return authError

  // Require reviewer or admin role
  const roleError = requireReviewer(profile)
  if (roleError) return roleError

  try {
    // Get all venues with restroom count
    // Note: With RLS, reviewers/admins can see all venues regardless of status
    const { data: venues, error } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        address,
        venue_type,
        status,
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
      status: venue.status,
      restroom_count: Array.isArray(venue.restrooms) ? venue.restrooms.length : 0,
    }))

    return NextResponse.json(venuesWithCount)
  } catch (error) {
    console.error('Error in admin venues list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
