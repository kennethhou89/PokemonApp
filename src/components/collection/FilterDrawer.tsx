import type { Condition } from '@/types/card'
import { CONDITION_LABELS } from '@/types/card'
import { useUIStore } from '@/store/uiStore'

const CONDITIONS: Condition[] = ['mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged']

interface FilterDrawerProps {
  sets: { id: string; name: string }[]
  onClose: () => void
}

export function FilterDrawer({ sets, onClose }: FilterDrawerProps) {
  const { filters, setConditions, setSetId, setSortBy, setSortDir, resetFilters } = useUIStore()

  function toggleCondition(c: Condition) {
    const current = filters.conditions
    if (current.includes(c)) setConditions(current.filter((x) => x !== c))
    else setConditions([...current, c])
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-72 bg-white h-full overflow-y-auto border-l-2 border-black flex flex-col">
        <div className="px-4 py-4 border-b-2 border-black flex items-center justify-between">
          <h2 className="font-head font-bold text-black">Filter & Sort</h2>
          <button
            onClick={resetFilters}
            className="text-xs font-head font-bold text-black border-2 border-black px-2 py-1 active:bg-primary transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="px-4 py-4 border-b-2 border-black">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Condition</div>
          <div className="flex flex-col gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => toggleCondition(c)}
                className={`flex items-center gap-2 px-3 py-2 text-sm text-left border-2 border-black transition-colors font-sans ${
                  filters.conditions.includes(c) ? 'bg-primary font-bold' : 'bg-white'
                }`}
              >
                <div className={`w-4 h-4 border-2 border-black flex items-center justify-center flex-shrink-0 ${
                  filters.conditions.includes(c) ? 'bg-black' : 'bg-white'
                }`}>
                  {filters.conditions.includes(c) && (
                    <svg className="w-2.5 h-2.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {sets.length > 0 && (
          <div className="px-4 py-4 border-b-2 border-black">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Set</div>
            <select
              value={filters.setId ?? ''}
              onChange={(e) => setSetId(e.target.value || null)}
              className="w-full border-2 border-black px-3 py-2 text-sm focus:outline-none font-sans bg-white"
            >
              <option value="">All Sets</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="px-4 py-4 border-b-2 border-black">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Sort By</div>
          <div className="flex flex-col gap-1.5">
            {(['date_added', 'name', 'value', 'quantity'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-2 text-sm text-left border-2 border-black transition-colors font-sans ${
                  filters.sortBy === s ? 'bg-primary font-bold' : 'bg-white'
                }`}
              >
                {{ date_added: 'Date Added', name: 'Name', value: 'Value', quantity: 'Quantity' }[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Direction</div>
          <div className="flex gap-2">
            {(['asc', 'desc'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setSortDir(d)}
                className={`flex-1 py-2 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${
                  filters.sortDir === d ? 'bg-primary' : 'bg-white'
                }`}
              >
                {d === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="m-4 mt-auto bg-black text-primary font-head font-bold py-3 border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  )
}
