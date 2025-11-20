import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, lat, lng, place_id, venue_type } = body

    if (!name || !address || !lat || !lng) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if venue already exists by place_id
    if (place_id) {
      const { data: existing } = await supabase
        .from('venues')
        .select('id')
        .eq('google_place_id', place_id)
        .single()

      if (existing) {
        return NextResponse.json(
          { success: true, venue_id: existing.id, already_exists: true },
          { status: 200 }
        )
      }
    }

    // Create new venue
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .insert({
        name,
        address,
        lat,
        lng,
        google_place_id: place_id || null,
        venue_type,
         coordinates: `POINT(${lng} ${lat})`,
        data_source: 'google_places',
        created_at: new Date().toISOString(),
      })
      .select()

    if (venueError) {
      console.error('Venue insert error:', venueError)
      return NextResponse.json(
        { error: 'Failed to create venue', details: venueError },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, venue_id: venueData[0].id },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}