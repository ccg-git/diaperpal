import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Generic database type for when we don't have generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any

// Create a Supabase client for public API routes (no auth required)
// This uses anon key and lazy initialization to avoid build-time issues
let supabaseClient: SupabaseClient<Database> | null = null

export function getPublicSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}

// Create a service role client for operations that need elevated privileges
let serviceClient: SupabaseClient<Database> | null = null

export function getServiceSupabase(): SupabaseClient<Database> {
  if (!serviceClient) {
    serviceClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return serviceClient
}
