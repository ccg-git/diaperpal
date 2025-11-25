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
