import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/public-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getServiceSupabase()
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