'use client'

interface DirectionsButtonProps {
  venueId: string
  lat: number
  lng: number
}

export default function DirectionsButton({ venueId, lat, lng }: DirectionsButtonProps) {
  async function handleClick() {
    // Track the click
    try {
      await fetch('/api/direction-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId, source: 'detail' }),
      })
    } catch {}

    // Open directions - detect iOS for Apple Maps
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank')
  }

  return (
    <button
      onClick={handleClick}
      className="block w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-lg text-center transition"
    >
      🧭 Get Directions
    </button>
  )
}
