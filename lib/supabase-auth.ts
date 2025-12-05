import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export type UserRole = 'user' | 'reviewer' | 'admin'

export interface AuthenticatedUser {
  user: User
  role: UserRole
}

/**
 * Create a Supabase client for browser usage (client components)
 * This client handles auth state automatically
 */
export function createBrowserClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

/**
 * Create a Supabase client authenticated with a user's access token
 * Used in API routes to make requests as the authenticated user
 */
export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

/**
 * Create a Supabase client with service role (bypasses RLS)
 * Only use for admin operations that truly need to bypass RLS
 */
export function createServiceClient(): SupabaseClient {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Extract access token from Authorization header
 */
export function extractAccessToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Get user and their role from an access token
 * Returns null if token is invalid or user doesn't exist
 */
export async function getUserFromToken(accessToken: string): Promise<AuthenticatedUser | null> {
  const supabase = createAuthenticatedClient(accessToken)

  // Get the user from the token
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('Error getting user from token:', userError?.message)
    return null
  }

  // Get the user's role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Error getting user profile:', profileError?.message)
    // User exists but no profile - this shouldn't happen if the trigger works
    // Default to 'user' role
    return {
      user,
      role: 'user',
    }
  }

  return {
    user,
    role: profile.role as UserRole,
  }
}

/**
 * Check if a role has admin privileges
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * Check if a role has reviewer privileges (reviewer or admin)
 */
export function isReviewer(role: UserRole): boolean {
  return role === 'reviewer' || role === 'admin'
}
