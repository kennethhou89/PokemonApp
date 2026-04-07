import { useCollection } from '@/hooks/useCollection'
import { useCollectionStats } from '@/hooks/useCollectionStats'
import { PageHeader } from '@/components/layout/PageHeader'
import { CardImage } from '@/components/cards/CardImage'
import { estimatedValue } from '@/types/card'
import type { Condition } from '@/types/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const PIE_COLORS = ['#22c55e', '#f97316', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6']

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0px_#000] p-4 flex flex-col gap-1">
      <div className="font-head text-2xl font-bold text-black">{value}</div>
      <div className="text-xs text-gray-500 font-sans uppercase tracking-wide">{label}</div>
    </div>
  )
}

export function StatsPage() {
  const { data: items = [], isLoading } = useCollection()
  const stats = useCollectionStats(items)

  if (isLoading) {
    return (
      <>
        <PageHeader title="Stats" />
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Stats" />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-20 h-20 border-2 border-black shadow-[4px_4px_0px_#000] bg-gray-100 flex items-center justify-center mb-4">
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <circle cx="50" cy="50" r="46" fill="white" stroke="black" strokeWidth="4"/>
              <path d="M4 50 A46 46 0 0 1 96 50" fill="#ef4444"/>
              <rect x="4" y="46" width="92" height="8" fill="black"/>
              <circle cx="50" cy="50" r="12" fill="white" stroke="black" strokeWidth="4"/>
              <circle cx="50" cy="50" r="6" fill="white" stroke="black" strokeWidth="3"/>
            </svg>
          </div>
          <h3 className="font-head text-xl font-bold text-black mb-1">No stats yet</h3>
          <p className="text-sm text-gray-500 font-sans">Add cards to see your collection stats</p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Stats" />

      {/* Yellow stat strip */}
      <div className="flex gap-2 px-3 py-2 bg-primary border-b-2 border-black overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
          <span className="font-head font-bold text-sm text-black">{stats.totalCards}</span>
          <span className="text-[10px] text-gray-500 ml-1 font-sans">cards</span>
        </div>
        <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
          <span className="font-head font-bold text-sm text-black">${stats.totalValue.toFixed(0)}</span>
          <span className="text-[10px] text-gray-500 ml-1 font-sans">est. value</span>
        </div>
        <div className="flex-shrink-0 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
          <span className="font-head font-bold text-sm text-black">{stats.bySet.length}</span>
          <span className="text-[10px] text-gray-500 ml-1 font-sans">sets</span>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-5">

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Cards" value={stats.totalCards.toLocaleString()} />
          <StatCard label="Unique Cards" value={stats.totalUniqueCards.toLocaleString()} />
          <StatCard label="Est. Value" value={`$${stats.totalValue.toFixed(2)}`} />
          <StatCard label="Sets" value={stats.bySet.length.toLocaleString()} />
        </div>

        {stats.bySet.length > 1 && (
          <div>
            <h3 className="font-head font-bold text-black mb-3">Value by Set</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.bySet} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Value']} />
                <Bar dataKey="value" fill="#ffdb33" stroke="#000" strokeWidth={2} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.conditionData.length > 0 && (
          <div>
            <h3 className="font-head font-bold text-black mb-3">Condition Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.conditionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(props) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {stats.conditionData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#000" strokeWidth={2} />
                  ))}
                </Pie>
                <Legend formatter={(v: string) => <span style={{ fontSize: 10 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.topCards.length > 0 && (
          <div>
            <h3 className="font-head font-bold text-black mb-3">Top Cards by Value</h3>
            <div className="border-2 border-black overflow-hidden shadow-[4px_4px_0px_#000]">
              {stats.topCards.map((item, i) => {
                const val = estimatedValue(item.price, item.condition as Condition, item.graded, item.grade, item.price_override)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-3 py-2.5 border-b-2 border-black last:border-b-0 ${i < 3 ? 'bg-primary' : 'bg-white'}`}
                  >
                    <span className="font-head text-2xl font-bold w-7 text-black leading-none">{i + 1}</span>
                    <CardImage src={item.card.image_small} alt={item.card.name} className="h-12 object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-head font-bold text-sm text-black truncate">{item.card.name}</div>
                      <div className="text-[10px] text-gray-600 truncate font-sans">{item.card.set_name}</div>
                    </div>
                    <span className="font-head font-bold text-base text-black flex-shrink-0">
                      {val != null ? fmt(val) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
