import { NextRequest, NextResponse } from 'next/server'
import { User } from '@supabase/supabase-js'
import {
  extractAccessToken,
  getUserFromToken,
  createAuthenticatedClient,
  createServiceClient,
} from './supabase-auth'

export interface AuthResult {
  success: true
  user: User
  supabase: ReturnType<typeof createAuthenticatedClient>
}

export interface AuthError {
  success: false
  response: NextResponse
}

/**
 * Require any authenticated user for an API route
 * Simply checks if the user is logged in with a valid Supabase session
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('Authorization')
  const accessToken = extractAccessToken(authHeader)

  if (!accessToken) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Missing or invalid Authorization header' },
        { status: 401 }
      ),
    }
  }

  const user = await getUserFromToken(accessToken)

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      ),
    }
  }

  // Create an authenticated Supabase client
  const supabase = createAuthenticatedClient(accessToken)

  return {
    success: true,
    user,
    supabase,
  }
}

/**
 * Get a service client for operations that need to bypass RLS
 */
export function getServiceClient() {
  return createServiceClient()
}
