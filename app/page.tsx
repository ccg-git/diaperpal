import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          Getting out the door is hard enough.
        </h1>

        {/* Subhead */}
        <p className="mt-4 text-lg text-gray-600">
          For when you've packed everything but the changing station.
        </p>

        {/* CTA Button */}
        <Link
          href="/map"
          className="inline-block mt-8 w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-lg rounded-lg transition"
        >
          Find a Station
        </Link>
      </div>
    </div>
  )
}
