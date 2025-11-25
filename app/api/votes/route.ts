import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if we have credentials
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { venue_id, vote_type } = body

    if (!venue_id || !vote_type) {
      return NextResponse.json(
        { error: 'Missing venue_id or vote_type' },
        { status: 400 }
      )
    }

    const userId = 'anon-user'

    const { data, error } = await supabase
      .from('votes')
      .insert({
        id: crypto.randomUUID(),
        venue_id,
        user_id: userId,
        vote_type,
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('Vote insert error:', error)
      return NextResponse.json(
        { error: 'Failed to record vote' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, vote: data[0] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}