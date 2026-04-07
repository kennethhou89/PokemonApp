import { useState } from 'react'

interface CardImageProps {
  src: string | null
  alt: string
  className?: string
}

export function CardImage({ src, alt, className = '' }: CardImageProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <div className={`bg-gray-100 rounded flex items-center justify-center ${className}`}>
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}
