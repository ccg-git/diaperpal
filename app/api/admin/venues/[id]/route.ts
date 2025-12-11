import { NextRequest, NextResponse } from 'next/server'
import { VenueType } from '@/lib/types'
import { requireAuth, getServiceClient } from '@/lib/auth-helpers'

// DELETE - Delete a venue and all its restrooms (cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authenticated user
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { id } = await params
  const supabase = getServiceClient()

  try {
    // First, get the venue to confirm it exists and get its name
    const { data: venue, error: fetchError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Delete all restrooms associated with this venue first
    const { error: restroomsDeleteError } = await supabase
      .from('restrooms')
      .delete()
      .eq('venue_id', id)

    if (restroomsDeleteError) {
      console.error('Error deleting restrooms:', restroomsDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete associated restrooms' },
        { status: 500 }
      )
    }

    // Now delete the venue
    const { error: venueDeleteError } = await supabase
      .from('venues')
      .delete()
      .eq('id', id)

    if (venueDeleteError) {
      console.error('Error deleting venue:', venueDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete venue' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Venue "${venue.name}" and all associated restrooms deleted`,
    })
  } catch (error) {
    console.error('Error in admin venues DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a venue (only venue_type is editable)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authenticated user
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { id } = await params
  const supabase = getServiceClient()

  try {
    const { venue_type } = await request.json()

    // Validate venue_type
    const validTypes: VenueType[] = ['food_drink', 'parks_outdoors', 'indoor_activities', 'errands']
    if (!venue_type || !validTypes.includes(venue_type)) {
      return NextResponse.json(
        { error: `Invalid venue_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Update the venue
    const { data: venue, error: updateError } = await supabase
      .from('venues')
      .update({ venue_type, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, venue_type')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
      }
      console.error('Error updating venue:', updateError)
      return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      venue: {
        id: venue.id,
        name: venue.name,
        venue_type: venue.venue_type,
      },
    })
  } catch (error) {
    console.error('Error in admin venues PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get a single venue with its restrooms (for admin panel)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authenticated user
  const authResult = await requireAuth(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { id } = await params
  const supabase = getServiceClient()

  try {
    const { data: venue, error } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        address,
        venue_type,
        restrooms(
          id,
          gender,
          station_location,
          restroom_location_text,
          status,
          safety_notes,
          admin_notes,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    return NextResponse.json(venue)
  } catch (error) {
    console.error('Error in admin venues GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
