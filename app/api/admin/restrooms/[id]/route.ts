import { NextRequest, NextResponse } from 'next/server'
import { Gender, StationLocation, VerificationStatus } from '@/lib/types'
import { requireAuth, getServiceClient } from '@/lib/auth-helpers'

// DELETE - Delete a restroom/station
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
    // First verify the restroom exists
    const { data: restroom, error: fetchError } = await supabase
      .from('restrooms')
      .select('id, gender')
      .eq('id', id)
      .single()

    if (fetchError || !restroom) {
      return NextResponse.json({ error: 'Restroom not found' }, { status: 404 })
    }

    // Delete any associated photos first
    const { error: photosDeleteError } = await supabase
      .from('restroom_photos')
      .delete()
      .eq('restroom_id', id)

    if (photosDeleteError) {
      console.error('Error deleting restroom photos:', photosDeleteError)
      // Continue anyway - photos might not exist
    }

    // Delete the restroom
    const { error: deleteError } = await supabase
      .from('restrooms')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting restroom:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete restroom' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Restroom deleted successfully',
    })
  } catch (error) {
    console.error('Error in admin restrooms DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a restroom/station
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
    const body = await request.json()
    const {
      gender,
      station_location,
      restroom_location_text,
      status,
      safety_notes,
      admin_notes,
      has_safety_concern,
      has_cleanliness_issue,
    } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Validate and add gender if provided
    if (gender !== undefined) {
      const validGenders: Gender[] = ['mens', 'womens', 'all_gender']
      if (!validGenders.includes(gender)) {
        return NextResponse.json(
          { error: `Invalid gender. Must be one of: ${validGenders.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.gender = gender
    }

    // Validate and add station_location if provided
    if (station_location !== undefined) {
      const validLocations: StationLocation[] = ['single_restroom', 'inside_stall', 'near_sinks']
      if (!validLocations.includes(station_location)) {
        return NextResponse.json(
          { error: `Invalid station_location. Must be one of: ${validLocations.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.station_location = station_location
    }

    // Validate and add status if provided
    if (status !== undefined) {
      const validStatuses: VerificationStatus[] = ['verified_present', 'verified_absent', 'unverified']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
      // Update verified_at timestamp if status changes to verified_present
      if (status === 'verified_present') {
        updateData.verified_at = new Date().toISOString()
      }
    }

    // Add optional text fields
    if (restroom_location_text !== undefined) {
      updateData.restroom_location_text = restroom_location_text || null
    }
    if (safety_notes !== undefined) {
      updateData.safety_notes = safety_notes || null
    }
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes || null
    }
    if (has_safety_concern !== undefined) {
      updateData.has_safety_concern = has_safety_concern
    }
    if (has_cleanliness_issue !== undefined) {
      updateData.has_cleanliness_issue = has_cleanliness_issue
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    // Update the restroom
    const { data: restroom, error: updateError } = await supabase
      .from('restrooms')
      .update(updateData)
      .eq('id', id)
      .select('id, gender, station_location, restroom_location_text, status, safety_notes, admin_notes')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Restroom not found' }, { status: 404 })
      }
      console.error('Error updating restroom:', updateError)
      return NextResponse.json({ error: 'Failed to update restroom' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      restroom,
    })
  } catch (error) {
    console.error('Error in admin restrooms PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
