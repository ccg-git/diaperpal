import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/public-api'

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase()
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