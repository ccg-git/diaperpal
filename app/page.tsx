import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full text-center">
        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
          Getting out the door is hard enough.
        </h1>

        {/* Subhead */}
        <p className="mt-3 text-base sm:text-lg text-gray-500 leading-relaxed">
          For when you've packed everything but the changing station.
        </p>

        {/* CTA Button */}
        <Link
          href="/map"
          className="inline-block mt-8 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition"
        >
          Find a Station
        </Link>
      </div>
    </div>
  )
}
