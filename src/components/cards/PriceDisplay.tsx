import type { Price, Condition } from '@/types/card'
import { estimatedValue, gradedValue } from '@/types/card'
import { useCurrency } from '@/contexts/CurrencyContext'

interface PriceDisplayProps {
  price: Price | null
  condition: Condition
  quantity?: number
  showTotal?: boolean
  graded?: boolean
  grade?: number | null
  priceOverride?: number | null
  cost?: number | null
}

export function PriceDisplay({
  price,
  condition,
  quantity = 1,
  showTotal = false,
  graded = false,
  grade = null,
  priceOverride = null,
  cost = null,
}: PriceDisplayProps) {
  const { fmt } = useCurrency()
  const val = estimatedValue(price, condition, graded, grade, priceOverride)
  if (val == null) return <span className="text-gray-400 text-sm">No price</span>

  const profit = cost != null ? val - cost : null

  return (
    <div className="text-right">
      <div className="text-sm font-semibold text-gray-900">
        {fmt(val)}
        {priceOverride != null && (
          <span className="ml-1 text-[10px] text-amber-500 font-medium">manual</span>
        )}
      </div>
      {showTotal && quantity > 1 && (
        <div className="text-xs text-gray-500">{fmt(val * quantity)} total</div>
      )}
      {profit != null && (
        <div className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {profit >= 0 ? '+' : ''}{fmt(profit)} P&L
        </div>
      )}
    </div>
  )
}

export function PriceTable({
  price,
  graded = false,
  grade = null,
}: {
  price: Price | null
  graded?: boolean
  grade?: number | null
}) {
  const { fmt } = useCurrency()
  if (graded && price) {
    const hasGradedData = price.grade_10 || price.grade_9 || price.grade_8 || price.grade_7
    const currentGradeValue = grade !== null ? gradedValue(price, grade) : null

    return (
      <div className="flex flex-col gap-2">
        {currentGradeValue && grade !== null && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {grade === 10 ? 'PSA/BGS 10 Value' : `Grade ${grade} Value`}
            </span>
            <span className="text-lg font-bold text-blue-900">{fmt(currentGradeValue)}</span>
          </div>
        )}
        {hasGradedData && (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['PSA 7', 'PSA 8', 'PSA 9', 'PSA 10'].map((h) => (
                    <th key={h} className="px-2 py-2 text-xs font-medium text-gray-500 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[price.grade_7, price.grade_8, price.grade_9, price.grade_10].map((v, i) => (
                    <td key={i} className="px-2 py-2 text-center font-medium text-gray-900 text-xs">{fmt(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Raw Low', 'Raw Mid', 'Raw Mkt', 'Raw High'].map((h) => (
                  <th key={h} className="px-2 py-2 text-xs font-medium text-gray-500 text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[price?.low, price?.mid, price?.market, price?.high].map((v, i) => (
                  <td key={i} className="px-2 py-2 text-center font-medium text-gray-900 text-xs">{fmt(v ?? null)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Low', 'Mid', 'Market', 'High'].map((h) => (
              <th key={h} className="px-3 py-2 text-xs font-medium text-gray-500 text-center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {[price?.low, price?.mid, price?.market, price?.high].map((v, i) => (
              <td key={i} className="px-3 py-2 text-center font-medium text-gray-900">{fmt(v ?? null)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
