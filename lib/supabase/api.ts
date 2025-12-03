import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Profile, UserRole } from '../types'

export async function createApiClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in API routes
          }
        },
      },
    }
  )
}

export async function getAuthenticatedUser() {
  const supabase = await createApiClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, profile: null, supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile: profile as Profile | null, supabase }
}

export function requireAuth(user: unknown): NextResponse | null {
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  return null
}

export function requireRole(
  profile: Profile | null,
  allowedRoles: UserRole[]
): NextResponse | null {
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }
  return null
}

export function requireReviewer(profile: Profile | null): NextResponse | null {
  return requireRole(profile, ['reviewer', 'admin'])
}

export function requireAdmin(profile: Profile | null): NextResponse | null {
  return requireRole(profile, ['admin'])
}
