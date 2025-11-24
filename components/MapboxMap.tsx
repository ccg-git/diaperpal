'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { VenueType, VENUE_TYPE_CONFIG } from '@/lib/types'

interface Venue {
  id: string
  name: string
  lat: number
  lng: number
  venue_type: VenueType
  distance_display: string
  is_open: boolean
}

interface MapboxMapProps {
  venues: Venue[]
  userLocation: { lat: number; lng: number } | null
  onVenueSelect: (venue: Venue) => void
  selectedVenueId?: string | null
}

export default function MapboxMap({
  venues,
  userLocation,
  onVenueSelect,
  selectedVenueId,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapReady, setMapReady] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return // Already initialized

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error('Mapbox token not found')
      return
    }

    mapboxgl.accessToken = token

    const center: [number, number] = userLocation
      ? [userLocation.lng, userLocation.lat]
      : [-118.4085, 33.8847] // Default: Manhattan Beach

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 14,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add user location marker
    if (userLocation) {
      new mapboxgl.Marker({ color: '#2A9D8F' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current)
    }

    map.current.on('load', () => {
      setMapReady(true)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [userLocation])

  // Add/update venue markers
  useEffect(() => {
    if (!map.current || !mapReady) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add venue markers
    venues.forEach((venue) => {
      const el = document.createElement('div')
      el.className = 'venue-marker'
      el.innerHTML = `
        <div class="relative cursor-pointer transform hover:scale-110 transition">
          <div class="w-10 h-10 bg-white rounded-full border-2 flex items-center justify-center shadow-lg ${
            selectedVenueId === venue.id ? 'border-teal-600 ring-2 ring-teal-300' : 'border-gray-400'
          }">
            <span class="text-lg">${VENUE_TYPE_CONFIG[venue.venue_type]?.emoji || '📍'}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 ${
            selectedVenueId === venue.id ? 'bg-teal-600' : 'bg-gray-400'
          } rotate-45"></div>
        </div>
      `

      el.addEventListener('click', () => {
        onVenueSelect(venue)
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map.current!)

      markersRef.current.push(marker)
    })
  }, [venues, mapReady, selectedVenueId, onVenueSelect])

  // Center map on selected venue
  useEffect(() => {
    if (!map.current || !selectedVenueId) return

    const selectedVenue = venues.find((v) => v.id === selectedVenueId)
    if (selectedVenue) {
      map.current.flyTo({
        center: [selectedVenue.lng, selectedVenue.lat],
        zoom: 15,
        duration: 500,
      })
    }
  }, [selectedVenueId, venues])

  return (
    <div
      ref={mapContainer}
      className="w-full h-full min-h-[60vh] rounded-xl overflow-hidden"
      style={{ position: 'relative' }}
    />
  )
}
