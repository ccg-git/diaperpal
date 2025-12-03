import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/public-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getServiceSupabase()
  const { id } = params

  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('facility_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Photos fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}