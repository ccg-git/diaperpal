import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

  try {
    const { id } = params

    // Get venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single()

    if (venueError || !venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      )
    }

    // Get facilities for this venue
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .eq('venue_id', id)

    if (facilitiesError) {
      console.error('Facilities error:', facilitiesError)
    }

    // Get photos for each facility
    const facilitiesWithPhotos = await Promise.all(
      (facilities || []).map(async (facility) => {
        const { data: photos } = await supabase
          .from('photos')
          .select('*')
          .eq('facility_id', facility.id)

        return {
          ...facility,
          photos: photos || [],
        }
      })
    )

    return NextResponse.json({
      ...venue,
      facilities: facilitiesWithPhotos,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}