import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const { data: venueData, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single()

    if (venueError) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    const { data: facilitiesData, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .eq('venue_id', id)

    if (facilitiesError) {
      console.error('Facilities fetch error:', facilitiesError)
    }

    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('venue_id', id)

    if (votesError) {
      console.error('Votes fetch error:', votesError)
    }

    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('venue_id', id)

    if (reportsError) {
      console.error('Reports fetch error:', reportsError)
    }

    const votes = votesData || []
    const votes_up = votes.filter((v: any) => v.vote_type === 'up').length
    const votes_down = votes.filter((v: any) => v.vote_type === 'down').length
    const reports = reportsData || []

    const facilities = facilitiesData || []
    const primaryFacility = facilities[0] || {}

    return NextResponse.json({
      id: venueData.id,
      name: venueData.name,
      address: venueData.address,
      privacy: primaryFacility.privacy_level || 'unknown',
      gender_accessibility: primaryFacility.facility_type || 'unknown',
      cleanliness: primaryFacility.cleanliness_rating || 0,
      votes_up,
      votes_down,
      reports: reports.length,
      last_verified: primaryFacility.verified_at
        ? new Date(primaryFacility.verified_at).toLocaleDateString()
        : 'Never',
      facilities,
      issues: primaryFacility.issues || '',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}