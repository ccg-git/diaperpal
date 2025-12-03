import { NextRequest, NextResponse } from 'next/server'
import { getPublicSupabase } from '@/lib/supabase/public-api'
import { isVenueOpen, getTodayHours } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getPublicSupabase()
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
