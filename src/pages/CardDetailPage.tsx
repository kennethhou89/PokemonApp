import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCollection, useUpdateCollectionItem, useDeleteCollectionItem } from '@/hooks/useCollection'
import { CardImage } from '@/components/cards/CardImage'
import { ConditionBadge } from '@/components/cards/ConditionBadge'
import { PriceTable } from '@/components/cards/PriceDisplay'
import { QuantityStepper } from '@/components/collection/QuantityStepper'
import type { Condition, GradingCompany } from '@/types/card'
import { CONDITION_LABELS, GRADING_COMPANIES, GRADE_OPTIONS, estimatedValue } from '@/types/card'
import { uploadPhoto, getPhotoUrl, deletePhoto } from '@/lib/storage'
import { useCurrency } from '@/contexts/CurrencyContext'

const CONDITIONS: Condition[] = ['mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-12 h-6 border-2 border-black transition-colors flex-shrink-0 relative ${value ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-black transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="font-head font-bold text-black text-sm mb-3">{children}</h3>
}

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: items = [] } = useCollection()
  const updateItem = useUpdateCollectionItem()
  const deleteItem = useDeleteCollectionItem()
  const { fmt } = useCurrency()

  const item = items.find((i) => i.id === id)

  const [notes, setNotes] = useState(item?.notes ?? '')
  const [graded, setGraded] = useState(item?.graded ?? false)
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>(item?.grading_company ?? 'PSA')
  const [grade, setGrade] = useState<number>(item?.grade ?? 9)
  const [certNumber, setCertNumber] = useState(item?.cert_number ?? '')
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  if (!item) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        Card not found.
      </div>
    )
  }

  function handleGradedToggle(val: boolean) {
    setGraded(val)
    updateItem.mutate({
      id: item!.id,
      updates: {
        graded: val,
        grading_company: val ? gradingCompany : null,
        grade: val ? grade : null,
        cert_number: val && certNumber ? certNumber : null,
      },
    })
  }

  function handleGradingCompanyChange(co: GradingCompany) {
    setGradingCompany(co)
    if (graded) updateItem.mutate({ id: item!.id, updates: { grading_company: co } })
  }

  function handleGradeChange(g: number) {
    setGrade(g)
    if (graded) updateItem.mutate({ id: item!.id, updates: { grade: g } })
  }

  function handleCertBlur() {
    if (graded) updateItem.mutate({ id: item!.id, updates: { cert_number: certNumber || null } })
  }

  function handleConditionChange(condition: Condition) {
    updateItem.mutate({ id: item!.id, updates: { condition } })
  }

  function handleQuantityChange(quantity: number) {
    updateItem.mutate({ id: item!.id, updates: { quantity } })
  }

  function handleNotesBlur() {
    updateItem.mutate({ id: item!.id, updates: { notes } })
  }

  function handleDelete() {
    if (confirm(`Remove ${item!.card.name} from your collection?`)) {
      deleteItem.mutate(item!.id, { onSuccess: () => navigate(-1) })
    }
  }

  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''
    setUploadingPhoto(true)
    try {
      const paths = await Promise.all(files.map((f) => uploadPhoto(item!.id, f)))
      const updated = [...(item!.user_photos ?? []), ...paths]
      await updateItem.mutateAsync({ id: item!.id, updates: { user_photos: updated } })
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleDeletePhoto(path: string) {
    if (!confirm('Remove this photo?')) return
    await deletePhoto(path)
    const updated = (item!.user_photos ?? []).filter((p) => p !== path)
    await updateItem.mutateAsync({ id: item!.id, updates: { user_photos: updated } })
    if (viewingPhoto === path) setViewingPhoto(null)
  }

  const val = estimatedValue(item.price, item.condition, graded, graded ? grade : null, item.price_override)

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b-2 border-black px-4 h-12 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-head font-bold text-black flex-1 truncate">{item.card.name}</h1>
      </div>

      {/* Card hero */}
      <div className="px-4 py-4 flex gap-4 items-start border-b-2 border-black">
        <div className="border-2 border-black shadow-[4px_4px_0px_#000]">
          <CardImage src={item.card.image_large ?? item.card.image_small} alt={item.card.name} className="w-28" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 font-sans">{item.card.set_name}</div>
          <div className="text-xs text-gray-400 font-sans">#{item.card.number}</div>
          {item.card.rarity && <div className="text-xs text-gray-400 font-sans">{item.card.rarity}</div>}
          {item.card.hp && <div className="text-xs text-gray-400 font-sans">HP {item.card.hp}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {graded ? (
              <span className="text-[9px] bg-black text-primary font-bold px-1.5 py-0.5 uppercase tracking-wide">
                {gradingCompany} {grade}
              </span>
            ) : (
              <ConditionBadge condition={item.condition} size="md" />
            )}
            {item.foil && (
              <span className="text-[9px] bg-black text-white font-bold px-1.5 py-0.5 uppercase tracking-wide">Foil</span>
            )}
          </div>
          {val != null && (
            <div className="mt-3">
              <span className="font-head text-2xl font-bold text-black">{fmt(val)}</span>
              <div className="text-[10px] text-gray-400 font-sans uppercase tracking-wide">est. value</div>
            </div>
          )}
        </div>
      </div>

      {/* Price table */}
      <div className="px-4 py-4 border-b-2 border-black">
        <SectionLabel>Market Prices</SectionLabel>
        <PriceTable price={item.price} graded={graded} grade={graded ? grade : null} />
        {item.price && (
          <p className="text-[10px] text-gray-400 mt-1 text-right font-sans">
            Updated {new Date(item.price.updated_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Graded toggle */}
      <div className="px-4 py-4 border-b-2 border-black">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-head font-bold text-black text-sm">Professionally Graded</div>
            <div className="text-xs text-gray-400 font-sans">PSA, BGS, or CGC slabbed</div>
          </div>
          <Toggle value={graded} onChange={handleGradedToggle} />
        </div>

        {graded && (
          <div className="border-2 border-black bg-gray-50 p-3 flex flex-col gap-3">
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Company</div>
              <div className="flex gap-2">
                {GRADING_COMPANIES.map((co) => (
                  <button
                    key={co}
                    onClick={() => handleGradingCompanyChange(co)}
                    className={`flex-1 py-2 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${
                      gradingCompany === co ? 'bg-primary' : 'bg-white'
                    }`}
                  >
                    {co}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Grade</div>
              <div className="flex flex-wrap gap-1.5">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => handleGradeChange(g)}
                    className={`w-11 py-1.5 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${
                      grade === g ? 'bg-primary' : 'bg-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cert # (optional)</div>
              <input
                type="text"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                onBlur={handleCertBlur}
                placeholder="e.g. 12345678"
                className="w-full border-2 border-black px-3 py-2 text-sm focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
              />
            </div>
          </div>
        )}
      </div>

      {/* Condition (ungraded only) */}
      {!graded && (
        <div className="px-4 py-4 border-b-2 border-black">
          <SectionLabel>Condition</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => handleConditionChange(c)}
                className={`px-3 py-2 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${
                  item.condition === c ? 'bg-primary' : 'bg-white'
                }`}
              >
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="px-4 py-4 border-b-2 border-black flex items-center justify-between">
        <SectionLabel>Quantity</SectionLabel>
        <QuantityStepper value={item.quantity} onChange={handleQuantityChange} />
      </div>

      {/* Photos */}
      <div className="px-4 py-4 border-b-2 border-black">
        <SectionLabel>
          Photos{uploadingPhoto && <span className="ml-2 text-xs font-sans font-normal text-gray-400">Uploading…</span>}
        </SectionLabel>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(item.user_photos ?? []).map((path) => (
            <div key={path} className="relative flex-shrink-0">
              <img
                src={getPhotoUrl(path)}
                alt=""
                className="w-20 h-28 object-cover border-2 border-black cursor-pointer"
                onClick={() => setViewingPhoto(path)}
              />
              <button
                type="button"
                onClick={() => void handleDeletePhoto(path)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-primary font-bold text-xs flex items-center justify-center leading-none border border-black"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex-shrink-0 w-20 h-28 bg-gray-100 flex flex-col items-center justify-center cursor-pointer active:bg-gray-200 border-2 border-dashed border-black">
            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] text-gray-400 font-sans">Add photo</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleAddPhotos(e)} />
          </label>
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 py-4 border-b-2 border-black">
        <SectionLabel>Notes</SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add personal notes..."
          rows={3}
          className="w-full border-2 border-black px-3 py-2 text-sm resize-none focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
        />
      </div>

      {/* Delete */}
      <div className="px-4 py-6">
        <button
          onClick={handleDelete}
          className="w-full py-3 border-2 border-black font-head font-bold text-sm shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all bg-white"
        >
          Remove from Collection
        </button>
      </div>

      {/* Fullscreen photo viewer */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <button
              onClick={() => setViewingPhoto(null)}
              className="w-9 h-9 border-2 border-white/40 flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => void handleDeletePhoto(viewingPhoto)}
              className="w-9 h-9 border-2 border-white/40 flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img
              src={getPhotoUrl(viewingPhoto)}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="h-8" />
        </div>
      )}
    </div>
  )
}
