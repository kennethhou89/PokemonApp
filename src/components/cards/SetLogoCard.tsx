import type { TCGSet } from '@/types/api'

export function SetLogoCard({ set, onClick }: { set: TCGSet; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-36 overflow-hidden bg-white border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all snap-start text-left"
    >
      <div className="h-[72px] bg-gray-50 border-b-2 border-black flex items-center justify-center px-2">
        <img src={set.images.logo} alt={set.name} className="w-full h-full object-contain" loading="lazy" />
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[11px] font-head font-bold text-black truncate leading-tight">{set.name}</div>
        <div className="text-[10px] text-gray-400 mt-0.5 font-sans">{set.series} · {set.releaseDate?.slice(0, 4)}</div>
      </div>
    </button>
  )
}

export function SetLogoCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-36 rounded-xl border border-gray-100 overflow-hidden snap-start">
      <div className="h-[72px] bg-gray-200 animate-pulse" />
      <div className="px-2 py-1.5">
        <div className="h-2.5 bg-gray-200 rounded w-3/4 animate-pulse mb-1" />
        <div className="h-2 bg-gray-200 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  )
}
