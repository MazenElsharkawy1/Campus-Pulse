'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export default function StarRating() {
  const [rating, setRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleClick = (value: number) => {
    if (submitted) return

    setRating(value)

    // Save to localStorage
    const entry = { rating: value, page: window.location.pathname, date: new Date().toISOString() }
    const existing = JSON.parse(localStorage.getItem('experienceRatings') || '[]')
    localStorage.setItem('experienceRatings', JSON.stringify([...existing, entry]))

    alert(`Thank you! You rated us ${value}/5`) // simple alert fallback

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="text-center py-6 text-green-600 dark:text-green-400 font-medium">
        Thanks for your feedback! ❤️
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
        How would you rate your experience?
      </p>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(null)}
            className="focus:outline-none transition-all hover:scale-110"
          >
            <Star
              size={48}
              className={`
                transition-all duration-200
                ${rating && star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : hoverRating && star <= hoverRating
                  ? 'fill-yellow-300/70 text-yellow-300/70'
                  : 'fill-none text-slate-300 dark:text-slate-600'}
              `}
            />
          </button>
        ))}
      </div>
    </div>
  )
}