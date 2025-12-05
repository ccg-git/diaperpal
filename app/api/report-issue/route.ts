import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type IssueType = 'safety' | 'cleanliness' | 'not_found' | 'other'

export async function POST(request: NextRequest) {
  // Create client inside handler to avoid build-time initialization errors
  // Use service client to allow anonymous updates to issue flags
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { restroom_id, issue_type, notes } = await request.json()

    // Validate required fields
    if (!restroom_id) {
      return NextResponse.json(
        { error: 'restroom_id is required' },
        { status: 400 }
      )
    }

    const validIssueTypes: IssueType[] = ['safety', 'cleanliness', 'not_found', 'other']
    if (!issue_type || !validIssueTypes.includes(issue_type)) {
      return NextResponse.json(
        { error: `issue_type must be one of: ${validIssueTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify restroom exists and get current notes
    const { data: restroom, error: fetchError } = await supabase
      .from('restrooms')
      .select('id, has_safety_concern, has_cleanliness_issue, safety_concern_notes, cleanliness_issue_notes')
      .eq('id', restroom_id)
      .single()

    if (fetchError || !restroom) {
      return NextResponse.json(
        { error: 'Restroom not found' },
        { status: 404 }
      )
    }

    // Build update object based on issue type
    const timestamp = new Date().toISOString()
    const notePrefix = `[${timestamp.split('T')[0]}] `
    const formattedNote = notes ? `${notePrefix}${notes}` : notePrefix + issue_type

    let updateData: Record<string, unknown> = {}

    switch (issue_type) {
      case 'safety':
        updateData = {
          has_safety_concern: true,
          safety_concern_notes: appendNote(restroom.safety_concern_notes, formattedNote),
        }
        break

      case 'cleanliness':
        updateData = {
          has_cleanliness_issue: true,
          cleanliness_issue_notes: appendNote(restroom.cleanliness_issue_notes, formattedNote),
        }
        break

      case 'not_found':
        // Mark as potential removal - admin will review
        updateData = {
          has_safety_concern: true,
          safety_concern_notes: appendNote(
            restroom.safety_concern_notes,
            `${notePrefix}USER REPORT: Station not found / may have been removed. ${notes || ''}`
          ),
        }
        break

      case 'other':
        // Store in safety_concern_notes as a catch-all for admin review
        updateData = {
          has_safety_concern: true,
          safety_concern_notes: appendNote(
            restroom.safety_concern_notes,
            `${notePrefix}OTHER: ${notes || 'No details provided'}`
          ),
        }
        break
    }

    // Update the restroom
    const { error: updateError } = await supabase
      .from('restrooms')
      .update(updateData)
      .eq('id', restroom_id)

    if (updateError) {
      console.error('Error updating restroom with report:', updateError)
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
    })
  } catch (error) {
    console.error('Error in report-issue API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Append a new note to existing notes, keeping a simple log format
 */
function appendNote(existingNotes: string | null, newNote: string): string {
  if (!existingNotes) {
    return newNote
  }
  // Keep notes reasonably sized - truncate if too long
  const combined = `${existingNotes}\n${newNote}`
  if (combined.length > 2000) {
    // Keep the most recent notes
    return combined.slice(-2000)
  }
  return combined
}
