import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const facilityId = formData.get('facility_id') as string
    const photoType = formData.get('photo_type') as string
    const fileName = formData.get('file_name') as string

    if (!file || !facilityId || !photoType || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('facility-photos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload photo' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('facility-photos')
      .getPublicUrl(fileName)

    const photoUrl = urlData.publicUrl

    // Save metadata to photos table
    const { error: dbError } = await supabase.from('photos').insert({
      facility_id: facilityId,
      photo_url: photoUrl,
      photo_type: photoType,
      uploaded_by: 'founder',
      status: 'approved',
    })

    if (dbError) {
      console.error('Database insert error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save photo metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, photo_url: photoUrl })
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}