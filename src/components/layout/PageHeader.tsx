import type React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  left?: React.ReactNode
  right?: React.ReactNode
}

export function PageHeader({ title, subtitle, left, right }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b-2 border-black px-4 h-14 flex items-center">
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {left}
          <div className="min-w-0">
            <h1 className="font-head text-lg font-bold text-black leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 font-sans">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </header>
  )
}
