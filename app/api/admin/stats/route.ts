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
    // Get total venues count
    const { count: totalVenues, error: venuesError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })

    if (venuesError) {
      console.error('Error counting venues:', venuesError)
    }

    // Get total restrooms count
    const { count: totalRestrooms, error: restroomsError } = await supabase
      .from('restrooms')
      .select('*', { count: 'exact', head: true })

    if (restroomsError) {
      console.error('Error counting restrooms:', restroomsError)
    }

    // Get total direction clicks count
    const { count: totalDirectionClicks, error: clicksError } = await supabase
      .from('direction_clicks')
      .select('*', { count: 'exact', head: true })

    if (clicksError) {
      console.error('Error counting direction clicks:', clicksError)
    }

    // Get recent venues (last 5)
    const { data: recentVenues, error: recentError } = await supabase
      .from('venues')
      .select('id, name, venue_type, status')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('Error fetching recent venues:', recentError)
    }

    return NextResponse.json({
      totalVenues: totalVenues ?? 0,
      totalRestrooms: totalRestrooms ?? 0,
      totalDirectionClicks: totalDirectionClicks ?? 0,
      recentVenues: recentVenues ?? [],
    })
  } catch (error) {
    console.error('Error in admin stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
