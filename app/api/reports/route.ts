import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/public-api'

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase()
  try {
    const body = await request.json()
    const { venue_id, issue_type } = body

    if (!venue_id || !issue_type) {
      return NextResponse.json(
        { error: 'Missing venue_id or issue_type' },
        { status: 400 }
      )
    }

    const userId = 'anon-user'

    const { data, error } = await supabase
      .from('reports')
      .insert({
        id: crypto.randomUUID(),
        venue_id,
        user_id: userId,
        issue_type,
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('Report insert error:', error)
      return NextResponse.json(
        { error: 'Failed to record report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, report: data[0] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
