import type { TCGSet } from '@/types/api'

export function SetGridTile({ set, onClick }: { set: TCGSet; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="overflow-hidden rounded-lg bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      <div className="h-24 py-5 flex items-center justify-center px-3">
        <img src={set.images.logo} alt={set.name} className="w-full h-full object-contain" loading="lazy" />
      </div>
      <div className="px-2.5 pb-2 flex items-center justify-between gap-1">
        <div className="text-[11px] font-sans font-medium text-gray-700 truncate leading-tight flex-1">{set.name}</div>
        <div className="flex-shrink-0 text-[9px] font-medium text-gray-400">{set.total}</div>
      </div>
    </button>
  )
}

export function SetGridTileSkeleton() {
  return (
    <div className="rounded-lg bg-gray-50 overflow-hidden">
      <div className="h-24 bg-gray-100 animate-pulse" />
      <div className="px-2.5 pb-2 pt-1">
        <div className="h-2.5 bg-gray-200 rounded w-3/4 animate-pulse" />
      </div>
    </div>
  )
}
