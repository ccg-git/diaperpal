import Link from 'next/link'

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: November 24, 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Agreement to Terms</h2>
            <p className="text-gray-700">
              By accessing or using DiaperPal (the "Service"), you agree to be bound by these Terms
              of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Description of Service</h2>
            <p className="text-gray-700">
              DiaperPal is a location-based platform that helps parents and caregivers find
              verified baby changing stations at nearby venues. The Service provides information
              about venues, changing station locations, and directions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Use of Service</h2>
            <p className="text-gray-700 mb-3">You agree to use the Service only for lawful purposes. You agree not to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Scrape, copy, or automatically collect data from the Service</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service for any commercial purpose without our consent</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">User Contributions</h2>
            <p className="text-gray-700 mb-3">
              If you submit any content to the Service (such as photos or venue information), you:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Grant us a non-exclusive, royalty-free license to use, display, and distribute the content</li>
              <li>Represent that you own or have the right to submit the content</li>
              <li>Agree that we may modify or remove content at our discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Accuracy of Information</h2>
            <p className="text-gray-700">
              We strive to provide accurate information about venues and changing stations.
              However, we cannot guarantee that all information is current, complete, or accurate.
              Venue hours, availability of changing stations, and other details may change without
              notice. We recommend calling ahead for critical needs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Third-Party Content</h2>
            <p className="text-gray-700">
              The Service displays information from third parties, including Google Places API.
              We are not responsible for the accuracy or content of third-party information.
              Google's terms of service apply to information sourced from their services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              SECURE, OR ERROR-FREE. WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Limitation of Liability</h2>
            <p className="text-gray-700">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIAPERPAL AND ITS OFFICERS, DIRECTORS,
              EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. THIS
              INCLUDES, BUT IS NOT LIMITED TO, DAMAGES RELATED TO:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
              <li>Inaccurate venue or changing station information</li>
              <li>Closed venues or unavailable facilities</li>
              <li>Safety conditions at any venue</li>
              <li>Your reliance on any information provided by the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify and hold harmless DiaperPal and its officers, directors,
              employees, and agents from any claims, damages, losses, or expenses arising from
              your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Modifications to Service</h2>
            <p className="text-gray-700">
              We reserve the right to modify, suspend, or discontinue the Service at any time
              without notice. We shall not be liable to you or any third party for any
              modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these Terms from time to time. We will notify you of any changes by
              posting the new Terms on this page and updating the "Last updated" date. Your
              continued use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with the laws of the
              State of California, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about these Terms, please contact us at:{' '}
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
