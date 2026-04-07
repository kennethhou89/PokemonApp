import type { Condition } from '@/types/card'
import { CONDITION_LABELS } from '@/types/card'

const BADGE_COLORS: Record<Condition, string> = {
  mint:               'bg-emerald-500 text-white',
  near_mint:          'bg-green-500 text-white',
  lightly_played:     'bg-yellow-400 text-black',
  moderately_played:  'bg-orange-500 text-white',
  heavily_played:     'bg-red-500 text-white',
  damaged:            'bg-gray-600 text-white',
}

interface ConditionBadgeProps {
  condition: Condition
  size?: 'sm' | 'md'
}

export function ConditionBadge({ condition, size = 'sm' }: ConditionBadgeProps) {
  const label = CONDITION_LABELS[condition]
  const colorClass = BADGE_COLORS[condition]
  const sizeClass = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'

  return (
    <span className={`inline-flex items-center font-bold uppercase tracking-wide ${colorClass} ${sizeClass}`}>
      {label}
    </span>
  )
}
