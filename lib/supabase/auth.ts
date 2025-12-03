import { SupabaseClient, User } from '@supabase/supabase-js'
import { Profile, UserRole } from '../types'

export interface AuthUser extends User {
  profile?: Profile
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export async function getCurrentUserWithProfile(supabase: SupabaseClient): Promise<{
  user: User | null
  profile: Profile | null
}> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { user: null, profile: null }
  }

  const profile = await getProfile(supabase, user.id)
  return { user, profile }
}

export function hasRole(profile: Profile | null, allowedRoles: UserRole[]): boolean {
  if (!profile) return false
  return allowedRoles.includes(profile.role)
}

export function isAdmin(profile: Profile | null): boolean {
  return hasRole(profile, ['admin'])
}

export function isReviewer(profile: Profile | null): boolean {
  return hasRole(profile, ['reviewer', 'admin'])
}
