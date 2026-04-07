import type { TCGSet } from '@/types/api'

export function SetLogoCard({ set, onClick }: { set: TCGSet; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-36 overflow-hidden bg-white outline outline-2 outline-black active:bg-gray-50 transition-colors snap-start text-left"
    >
      <div className="h-[100px] py-5 flex items-center justify-center px-3">
        <img src={set.images.logo} alt={set.name} className="w-full h-full object-contain" loading="lazy" />
      </div>
      <div className="px-2.5 pb-2">
        <div className="text-[11px] font-sans font-medium text-gray-700 truncate leading-tight">{set.name}</div>
        <div className="text-[10px] text-gray-400 mt-0.5 font-sans">{set.series} · {set.releaseDate?.slice(0, 4)}</div>
      </div>
    </button>
  )
}

export function SetLogoCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-36 bg-white outline outline-2 outline-black overflow-hidden snap-start">
      <div className="h-[100px] bg-gray-100 animate-pulse" />
      <div className="px-2.5 pb-2 pt-1">
        <div className="h-2.5 bg-gray-200 rounded w-3/4 animate-pulse mb-1" />
        <div className="h-2 bg-gray-200 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  )
}
