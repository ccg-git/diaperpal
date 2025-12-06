import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
 * Verify token and get the authenticated user
 * Returns null if token is invalid or user doesn't exist
 */
export async function getUserFromToken(accessToken: string): Promise<User | null> {
  const supabase = createAuthenticatedClient(accessToken)

  // Get the user from the token
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('Error getting user from token:', userError?.message)
    return null
  }

  return user
}
