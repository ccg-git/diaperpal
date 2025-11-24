// DiaperPal Utility Functions

import { HoursJson, DayHours, VenueType, Gender, StationLocation } from './types'

// ============================================
// Distance Formatting
// ============================================

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters * 0.000621371
}

/**
 * Format distance for display
 * Shows feet if < 0.3 miles, otherwise miles
 */
export function formatDistance(miles: number): string {
  if (miles < 0.3) {
    const feet = Math.round(miles * 5280)
    return `${feet} ft`
  }
  return `${miles.toFixed(1)} mi`
}

// ============================================
// Hours / Open Status (PT Timezone)
// ============================================

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/**
 * Get current day/time in Pacific Time
 */
function getPacificTime(): { day: string; hour: number; minute: number } {
  const now = new Date()
  const ptTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))

  return {
    day: DAYS[ptTime.getDay()],
    hour: ptTime.getHours(),
    minute: ptTime.getMinutes(),
  }
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if venue is currently open based on hours_json
 */
export function isVenueOpen(hoursJson: HoursJson | null): boolean {
  if (!hoursJson) return true // Assume open if no hours data

  const { day, hour, minute } = getPacificTime()
  const todayHours = hoursJson[day as keyof HoursJson]

  if (!todayHours) return false // No hours for today = closed

  const currentMinutes = hour * 60 + minute
  const openMinutes = parseTimeToMinutes(todayHours.open)
  const closeMinutes = parseTimeToMinutes(todayHours.close)

  // Handle overnight hours (close time < open time means closes next day)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

/**
 * Get today's hours for display
 */
export function getTodayHours(hoursJson: HoursJson | null): DayHours | null {
  if (!hoursJson) return null

  const { day } = getPacificTime()
  return hoursJson[day as keyof HoursJson] || null
}

/**
 * Format time for display (24h to 12h)
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Get formatted hours for all days of the week
 */
export function getFormattedWeeklyHours(hoursJson: HoursJson | null): Array<{ day: string; hours: string; isToday: boolean }> {
  const { day: currentDay } = getPacificTime()
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return dayNames.map((dayName, index) => {
    const dayKey = dayKeys[index] as keyof HoursJson
    const dayHours = hoursJson?.[dayKey]
    const isToday = currentDay === dayKey

    return {
      day: dayName,
      hours: dayHours
        ? `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`
        : 'Closed',
      isToday,
    }
  })
}

// ============================================
// Venue Type Helpers
// ============================================

export function getVenueTypeEmoji(type: VenueType): string {
  const emojis: Record<VenueType, string> = {
    food_drink: '☕',
    parks_outdoors: '🌳',
    indoor_activities: '🎨',
    errands: '🛍️',
  }
  return emojis[type] || '📍'
}

export function getVenueTypeLabel(type: VenueType): string {
  const labels: Record<VenueType, string> = {
    food_drink: 'Food & Drink',
    parks_outdoors: 'Parks',
    indoor_activities: 'Indoor',
    errands: 'Errands',
  }
  return labels[type] || type
}

// ============================================
// Gender Helpers
// ============================================

export function getGenderEmoji(gender: Gender): string {
  const emojis: Record<Gender, string> = {
    mens: '👨',
    womens: '👩',
    all_gender: '🚻',
  }
  return emojis[gender] || ''
}

export function getGenderLabel(gender: Gender): string {
  const labels: Record<Gender, string> = {
    mens: "Men's",
    womens: "Women's",
    all_gender: 'All-Gender',
  }
  return labels[gender] || gender
}

// ============================================
// Station Location Helpers
// ============================================

export function getStationLocationEmoji(location: StationLocation): string {
  const emojis: Record<StationLocation, string> = {
    single_restroom: '🔒',
    inside_stall: '🚪',
    near_sinks: '⚡',
  }
  return emojis[location] || ''
}

export function getStationLocationLabel(location: StationLocation): string {
  const labels: Record<StationLocation, string> = {
    single_restroom: 'Single Restroom',
    inside_stall: 'Inside Stall',
    near_sinks: 'Near Sinks',
  }
  return labels[location] || location
}

// ============================================
// Color Palette (Teal Theme)
// ============================================

export const COLORS = {
  teal: '#2A9D8F',
  tealDark: '#238276',
  tealLight: '#3DB8A9',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  darkGray: '#1F2937',
  mediumGray: '#6B7280',
  lightGray: '#F3F4F6',
  borderGray: '#E5E7EB',
} as const

// ============================================
// Tailwind Class Helpers
// ============================================

export const buttonClasses = {
  primary: 'bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition',
  secondary: 'border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition',
  chip: {
    active: 'bg-teal-600 text-white',
    inactive: 'bg-white border border-gray-300 text-gray-700 hover:border-teal-400',
  },
} as const
