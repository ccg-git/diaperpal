import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { venue_id } = await request.json()

    if (!venue_id) {
      return NextResponse.json({ error: 'venue_id is required' }, { status: 400 })
    }

    // Get user agent and hash IP for privacy
    const userAgent = request.headers.get('user-agent') || null
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)

    // Record the click
    const { error: insertError } = await supabase
      .from('direction_clicks')
      .insert({
        venue_id,
        user_agent: userAgent,
        ip_hash: ipHash,
      })

    if (insertError) {
      console.error('Error recording direction click:', insertError)
      return NextResponse.json({ error: 'Failed to record click' }, { status: 500 })
    }

    // Get total click count for this venue
    const { count, error: countError } = await supabase
      .from('direction_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venue_id)

    if (countError) {
      console.error('Error counting clicks:', countError)
    }

    return NextResponse.json({
      success: true,
      click_count: count || 0,
    })
  } catch (error) {
    console.error('Error in direction-click API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
