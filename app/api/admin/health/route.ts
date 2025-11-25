import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Health check endpoint for diagnosing admin panel issues
 * Returns configuration status without exposing secrets
 */
export async function GET(request: NextRequest) {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    admin_password: !!process.env.ADMIN_PASSWORD,
    google_maps_key: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    google_places_key: !!process.env.GOOGLE_PLACES_API_KEY,
    database_connection: false,
  }

  // Test database connection
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.from('venues').select('id').limit(1)
      checks.database_connection = !error
    } catch {
      checks.database_connection = false
    }
  }

  const allConfigured = Object.values(checks).every(Boolean)

  return NextResponse.json({
    status: allConfigured ? 'healthy' : 'misconfigured',
    checks,
    message: allConfigured
      ? 'All environment variables configured'
      : 'Some environment variables are missing. Check Vercel dashboard.',
    missing: Object.entries(checks)
      .filter(([, value]) => !value)
      .map(([key]) => key),
  })
}
