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
      .select('id, name, venue_type')
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
