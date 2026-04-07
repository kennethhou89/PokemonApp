import type { TCGSet } from '@/types/api'

export function SetGridTile({ set, onClick }: { set: TCGSet; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="overflow-hidden border-2 border-black bg-white shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-left"
    >
      <div className="h-14 bg-gray-50 border-b-2 border-black flex items-center justify-center px-2">
        <img src={set.images.logo} alt={set.name} className="w-full h-full object-contain" loading="lazy" />
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between gap-1">
        <div className="text-[11px] font-head font-bold text-black truncate leading-tight flex-1">{set.name}</div>
        <div className="flex-shrink-0 text-[9px] font-bold bg-black text-primary px-1.5 py-0.5">{set.total}</div>
      </div>
    </button>
  )
}

export function SetGridTileSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="h-14 bg-gray-200 animate-pulse" />
      <div className="px-2 py-1.5">
        <div className="h-2.5 bg-gray-200 rounded w-3/4 animate-pulse" />
      </div>
    </div>
  )
}
