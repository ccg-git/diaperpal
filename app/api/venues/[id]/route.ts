import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isVenueOpen, getTodayHours } from '@/lib/utils'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if we have credentials
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { id } = params

  try {
    // Fetch venue with restrooms and photos
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select(`
        *,
        restrooms (
          *,
          photos:restroom_photos(*)
        )
      `)
      .eq('id', id)
      .single()

    if (venueError || !venue) {
      console.error('Error fetching venue:', venueError)
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Filter out verified_absent restrooms (don't show to users)
    const filteredRestrooms = (venue.restrooms || []).filter(
      (r: { status: string }) => r.status !== 'verified_absent'
    )

    // Calculate open status
    const is_open = isVenueOpen(venue.hours_json)
    const hours_today = getTodayHours(venue.hours_json)

    return NextResponse.json({
      ...venue,
      restrooms: filteredRestrooms,
      is_open,
      hours_today,
    })
  } catch (error) {
    console.error('Error in venue detail API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
