'use client'

import { useState } from 'react'

type IssueType = 'safety' | 'cleanliness' | 'not_found' | 'other'

interface ReportIssueButtonProps {
  restroomId: string
  venueName: string
  restroomLabel: string
}

const ISSUE_TYPES: { value: IssueType; label: string; emoji: string; description: string }[] = [
  {
    value: 'safety',
    label: 'Safety Concern',
    emoji: '⚠️',
    description: 'Broken strap, unstable table, or other hazard',
  },
  {
    value: 'cleanliness',
    label: 'Cleanliness Issue',
    emoji: '🧹',
    description: 'Dirty, needs cleaning, or unsanitary',
  },
  {
    value: 'not_found',
    label: 'Station Not Found',
    emoji: '❌',
    description: "Couldn't find or station was removed",
  },
  {
    value: 'other',
    label: 'Other Issue',
    emoji: '📝',
    description: 'Something else we should know about',
  },
]

export default function ReportIssueButton({
  restroomId,
  venueName,
  restroomLabel,
}: ReportIssueButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<IssueType | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedType) {
      setError('Please select an issue type')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restroom_id: restroomId,
          issue_type: selectedType,
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit report')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    setIsOpen(false)
    // Reset form after animation
    setTimeout(() => {
      setSelectedType(null)
      setNotes('')
      setSubmitted(false)
      setError('')
    }, 300)
  }

  return (
    <>
      {/* Report Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition"
      >
        <span>🚩</span>
        <span>Report issue</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Report an Issue</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {submitted ? (
                /* Success State */
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Thanks for reporting!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We'll review this and update the listing if needed.
                  </p>
                  <button
                    onClick={handleClose}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-lg transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit}>
                  {/* Context */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{venueName}</span>
                      <br />
                      {restroomLabel}
                    </p>
                  </div>

                  {/* Issue Type Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      What's the issue?
                    </label>
                    <div className="space-y-2">
                      {ISSUE_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setSelectedType(type.value)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition ${
                            selectedType === type.value
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{type.emoji}</span>
                            <div>
                              <div className="font-medium text-gray-900">
                                {type.label}
                              </div>
                              <div className="text-sm text-gray-500">
                                {type.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any extra info that would help us..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {notes.length}/500
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedType}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>

                  {/* Privacy Note */}
                  <p className="text-xs text-gray-400 text-center mt-4">
                    Reports are anonymous and help us keep information accurate.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
