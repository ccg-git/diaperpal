// DiaperPal Type Definitions
// Updated to match spec v2.0

// ============================================
// Venue Types
// ============================================

export type VenueType = 'food_drink' | 'parks_outdoors' | 'indoor_activities' | 'errands'

export type Gender = 'mens' | 'womens' | 'all_gender'

export type StationLocation = 'single_restroom' | 'inside_stall' | 'near_sinks'

export type VerificationStatus = 'verified_present' | 'verified_absent' | 'unverified'

export type ModerationStatus = 'pending' | 'approved' | 'rejected'

// ============================================
// Database Models
// ============================================

export interface Venue {
  id: string
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: VenueType
  hours_json: HoursJson | null
  special_hours: SpecialHours[] | null
  rating: number | null
  review_count: number | null
  photo_urls: string[] | null
  family_amenities: Record<string, unknown>
  created_at: string
  updated_at: string
  google_data_refreshed_at: string | null
}

export interface HoursJson {
  monday?: DayHours
  tuesday?: DayHours
  wednesday?: DayHours
  thursday?: DayHours
  friday?: DayHours
  saturday?: DayHours
  sunday?: DayHours
}

export interface DayHours {
  open: string  // "06:00" format
  close: string // "20:00" format
}

export interface SpecialHours {
  date: string  // "2025-12-25" format
  closed?: boolean
  open?: string
  close?: string
}

export interface Restroom {
  id: string
  venue_id: string
  gender: Gender
  station_location: StationLocation
  restroom_location_text: string | null
  status: VerificationStatus
  verified_by_user_id: string | null
  verified_at: string | null
  moderation_status: ModerationStatus
  // Safety and cleanliness issue tracking
  has_safety_concern: boolean
  safety_concern_notes: string | null
  has_cleanliness_issue: boolean
  cleanliness_issue_notes: string | null
  // Tips like "ask for key", general notes
  additional_notes: string | null
  // Legacy field - kept for backwards compatibility
  safety_notes: string | null
  admin_notes: string | null
  // Direct photo URL (simpler than separate table)
  photo_url: string | null
  // Usage tracking
  times_directions_clicked: number
  created_at: string
  updated_at: string
  created_by_user_id: string | null
}

export interface RestroomPhoto {
  id: string
  restroom_id: string
  image_url: string
  is_primary: boolean
  uploaded_by_user_id: string | null
  moderation_status: ModerationStatus
  created_at: string
}

export interface DirectionClick {
  id: string
  venue_id: string
  clicked_at: string
  user_agent: string | null
  ip_hash: string | null
}

// ============================================
// API Response Types
// ============================================

export interface VenueWithRestrooms extends Venue {
  restrooms: RestroomWithPhotos[]
  distance?: number
  distance_display?: string
  is_open?: boolean
  hours_today?: DayHours | null
}

export interface RestroomWithPhotos extends Restroom {
  photos: RestroomPhoto[]
}

export interface NearbyVenueResponse {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  venue_type: VenueType
  distance: number
  distance_display: string
  is_open: boolean
  hours_today: DayHours | null
  rating: number | null
  review_count: number | null
  restrooms: RestroomWithPhotos[]
}

// ============================================
// Filter Types
// ============================================

export interface Filters {
  gender: Gender[]
  venueType: VenueType[]
  stationLocation: StationLocation[]
  openNow: boolean
}

// ============================================
// Helper Constants
// ============================================

export const VENUE_TYPE_CONFIG = {
  food_drink: { emoji: '☕', label: 'Food & Drink' },
  parks_outdoors: { emoji: '🌳', label: 'Parks' },
  indoor_activities: { emoji: '🎨', label: 'Indoor' },
  errands: { emoji: '🛍️', label: 'Errands' },
} as const

export const GENDER_CONFIG = {
  mens: { emoji: '👨', label: "Men's" },
  womens: { emoji: '👩', label: "Women's" },
  all_gender: { emoji: '🚻', label: 'All-Gender' },
} as const

export const STATION_LOCATION_CONFIG = {
  single_restroom: { emoji: '🔒', label: 'Single Restroom', description: 'Entire lockable room' },
  inside_stall: { emoji: '🚪', label: 'Inside Stall', description: 'Enclosed stall in shared restroom' },
  near_sinks: { emoji: '⚡', label: 'Near Sinks', description: 'Wall-mounted in open area' },
} as const

export const STATUS_CONFIG = {
  verified_present: { emoji: '✅', label: 'Verified' },
  unverified: { emoji: '❓', label: 'Unverified' },
  verified_absent: { emoji: '❌', label: 'Not Available' },
} as const
