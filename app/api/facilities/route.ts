import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/public-api'

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase()
  try {
    const body = await request.json()
    const {
      venue_id,
      privacy_type,
      gender,
      location_in_venue,
      station_status,
      station_location,
      safety_concern,
      cleanliness_issue,
      issue_notes,
      additional_notes,
    } = body

    if (!venue_id || !privacy_type || !gender || !station_status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine facility_type for backwards compatibility
    const facility_type = gender === 'mens' ? 'mens' : gender === 'womens' ? 'womens' : 'family'

    // Create facility
    const { data: facilityData, error: facilityError } = await supabase
      .from('facilities')
      .insert({
        venue_id,
        facility_type,
        privacy_type,
        gender,
        location_in_venue,
        verification_status: station_status === 'verified_present' ? 'verified_present' : 
                            station_status === 'verified_absent' ? 'verified_absent' : 'unverified',
        station_location: station_location || null,
        safety_concern: safety_concern || false,
        cleanliness_issue: cleanliness_issue || false,
        issues: issue_notes || additional_notes || '',
        verified_by: 'founder',
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()

    if (facilityError) {
      console.error('Facility insert error:', facilityError)
      return NextResponse.json(
        { error: 'Failed to create facility', details: facilityError },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, facility_id: facilityData[0].id },
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