// Re-export all Supabase utilities for easy importing
export { createClient as createBrowserClient } from './client'
export { createClient as createServerClient, createServiceClient } from './server'
export { updateSession } from './middleware'
export {
  getProfile,
  getCurrentUserWithProfile,
  hasRole,
  isAdmin,
  isReviewer,
  type AuthUser
} from './auth'
