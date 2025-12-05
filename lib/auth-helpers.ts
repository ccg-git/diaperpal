import { NextRequest, NextResponse } from 'next/server'
import {
  extractAccessToken,
  getUserFromToken,
  isAdmin,
  isReviewer,
  createAuthenticatedClient,
  createServiceClient,
  AuthenticatedUser,
  UserRole,
} from './supabase-auth'

export interface AuthResult {
  success: true
  user: AuthenticatedUser
  supabase: ReturnType<typeof createAuthenticatedClient>
}

export interface AuthError {
  success: false
  response: NextResponse
}

/**
 * Require authentication and admin role for an API route
 * Returns the authenticated user and a Supabase client if successful
 * Returns an error response if not authorized
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult | AuthError> {
  const authResult = await authenticate(request)

  if (!authResult.success) {
    return authResult
  }

  if (!isAdmin(authResult.user.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * Require authentication and reviewer role (or admin) for an API route
 * Returns the authenticated user and a Supabase client if successful
 * Returns an error response if not authorized
 */
export async function requireReviewer(request: NextRequest): Promise<AuthResult | AuthError> {
  const authResult = await authenticate(request)

  if (!authResult.success) {
    return authResult
  }

  if (!isReviewer(authResult.user.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Reviewer role required' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * Require any authenticated user
 * Returns the authenticated user and a Supabase client if successful
 * Returns an error response if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  return authenticate(request)
}

/**
 * Internal authentication function
 */
async function authenticate(request: NextRequest): Promise<AuthResult | AuthError> {
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

  const authUser = await getUserFromToken(accessToken)

  if (!authUser) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      ),
    }
  }

  // Create an authenticated Supabase client that respects RLS
  const supabase = createAuthenticatedClient(accessToken)

  return {
    success: true,
    user: authUser,
    supabase,
  }
}

/**
 * Get a service client for operations that need to bypass RLS
 * Use sparingly - prefer authenticated client with RLS
 */
export function getServiceClient() {
  return createServiceClient()
}

/**
 * Helper to check roles inline
 */
export { isAdmin, isReviewer }
export type { AuthenticatedUser, UserRole }
