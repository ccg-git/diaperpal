import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link
            href="/map"
            className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: November 24, 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Introduction</h2>
            <p className="text-gray-700">
              DiaperPal ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, and share information when you use our mobile application
              and website (collectively, the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Information We Collect</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Location Data</h3>
            <p className="text-gray-700 mb-3">
              We collect your device's location when you use the Service to show you nearby venues
              with changing stations. This data is used only to provide the core functionality of the
              app and is not stored on our servers.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Usage Data</h3>
            <p className="text-gray-700 mb-3">
              We collect anonymous usage data including pages viewed, features used, and interaction
              patterns. This helps us improve the Service. We use privacy-friendly analytics
              (Posthog) that does not require cookies.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Device Information</h3>
            <p className="text-gray-700">
              We may collect information about your device, including device type, operating system,
              and browser type. This is used solely for analytics and improving compatibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>To provide and maintain the Service</li>
              <li>To show you nearby venues with changing stations</li>
              <li>To improve and optimize the Service</li>
              <li>To understand usage patterns and trends</li>
              <li>To communicate with you about the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Third-Party Services</h2>
            <p className="text-gray-700 mb-3">We use the following third-party services:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Google Places API:</strong> To display venue information, hours, and photos</li>
              <li><strong>Mapbox:</strong> To display maps and directions</li>
              <li><strong>Posthog:</strong> For privacy-friendly analytics (no cookies required)</li>
              <li><strong>Supabase:</strong> For database hosting and storage</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Each of these services has their own privacy policies. We encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Data Sharing</h2>
            <p className="text-gray-700">
              We do not sell your personal data. We may share aggregated, anonymized data with
              business partners (such as municipalities or venues) to help improve parent-friendly
              facilities in your area.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Data Retention</h2>
            <p className="text-gray-700">
              Location data is not stored on our servers. Analytics data is retained for up to
              12 months. You may request deletion of any data associated with your device by
              contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Your Rights</h2>
            <p className="text-gray-700 mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Request access to your data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of analytics (through browser settings)</li>
              <li>Disable location services for the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Children's Privacy</h2>
            <p className="text-gray-700">
              The Service is intended for use by parents and caregivers. We do not knowingly
              collect personal information from children under 13. If you believe we have
              collected information from a child, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the "Last
              updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, please contact us at:{' '}
              <a href="mailto:hello@diaperpal.com" className="text-teal-600 hover:underline">
                hello@diaperpal.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>DiaperPal © 2025</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-teal-600 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
