import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full text-center">
        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Looking for a Diaper Changing Station?
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-base sm:text-lg text-gray-500">
          DiaperPal is here to help
        </p>

        {/* CTA Button */}
        <Link
          href="/map"
          className="inline-block mt-8 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition"
        >
          Find a Nearby Station
        </Link>
      </div>
    </div>
  )
}
