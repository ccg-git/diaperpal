import { NextRequest, NextResponse } from 'next/server'
import { requireReviewer, getServiceClient } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  // Require reviewer or admin role to view stats
  const authResult = await requireReviewer(request)
  if (!authResult.success) {
    return authResult.response
  }

  // Use service client for stats since we need to count all records
  const supabase = getServiceClient()

  try {
    // Get total venues count
    const { count: totalVenues, error: venuesError } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })

    if (venuesError) {
      console.error('Error counting venues:', venuesError)
    }

    // Get total restrooms count
    const { count: totalRestrooms, error: restroomsError } = await supabase
      .from('restrooms')
      .select('*', { count: 'exact', head: true })

    if (restroomsError) {
      console.error('Error counting restrooms:', restroomsError)
    }

    // Get total direction clicks count
    const { count: totalDirectionClicks, error: clicksError } = await supabase
      .from('direction_clicks')
      .select('*', { count: 'exact', head: true })

    if (clicksError) {
      console.error('Error counting direction clicks:', clicksError)
    }

    // Get direction clicks breakdown by source
    const { data: clicksBySource, error: sourceError } = await supabase
      .from('direction_clicks')
      .select('source')

    if (sourceError) {
      console.error('Error fetching clicks by source:', sourceError)
    }

    // Count clicks by source
    const sourceBreakdown = { list: 0, map: 0, detail: 0 }
    if (clicksBySource) {
      for (const click of clicksBySource) {
        const src = click.source as keyof typeof sourceBreakdown
        if (src in sourceBreakdown) {
          sourceBreakdown[src]++
        }
      }
    }

    // Get recent venues (last 5)
    const { data: recentVenues, error: recentError } = await supabase
      .from('venues')
      .select('id, name, venue_type')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('Error fetching recent venues:', recentError)
    }

    return NextResponse.json({
      totalVenues: totalVenues ?? 0,
      totalRestrooms: totalRestrooms ?? 0,
      totalDirectionClicks: totalDirectionClicks ?? 0,
      clicksBySource: sourceBreakdown,
      recentVenues: recentVenues ?? [],
    })
  } catch (error) {
    console.error('Error in admin stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
