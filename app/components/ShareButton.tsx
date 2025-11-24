'use client'

interface ShareButtonProps {
  title: string
  text: string
  url: string
}

export default function ShareButton({ title, text, url }: ShareButtonProps) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch (err) {
        // User cancelled or share failed - fallback to clipboard
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!')
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('Link copied to clipboard!')
    })
  }

  return (
    <button
      onClick={handleShare}
      className="text-gray-500 hover:text-teal-600 transition p-2 -mr-2"
      title="Share this venue"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    </button>
  )
}
