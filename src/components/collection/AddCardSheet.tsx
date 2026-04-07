import { useState } from 'react'
import type { TCGCard } from '@/types/api'
import type { Condition, GradingCompany } from '@/types/card'
import { CONDITION_LABELS, GRADING_COMPANIES, GRADE_OPTIONS } from '@/types/card'
import { QuantityStepper } from './QuantityStepper'
import { CardImage } from '@/components/cards/CardImage'
import { useAddCard } from '@/hooks/useCollection'
import { uploadPhoto } from '@/lib/storage'
import { supabase } from '@/lib/supabase'

export interface AddCardSheetPrefill {
  graded?: boolean
  gradingCompany?: GradingCompany
  grade?: number
  certNumber?: string
}

interface AddCardSheetProps {
  card: TCGCard
  onClose: () => void
  onAdded: () => void
  prefill?: AddCardSheetPrefill
}

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

export function AddCardSheet({ card, onClose, onAdded, prefill }: AddCardSheetProps) {
  const [condition, setCondition] = useState<Condition>('near_mint')
  const [quantity, setQuantity] = useState(1)
  const [foil, setFoil] = useState(false)
  const [notes, setNotes] = useState('')
  const [graded, setGraded] = useState(prefill?.graded ?? false)
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>(prefill?.gradingCompany ?? 'PSA')
  const [grade, setGrade] = useState<number>(prefill?.grade ?? 9)
  const [certNumber, setCertNumber] = useState(prefill?.certNumber ?? '')
  const [priceOverride, setPriceOverride] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState('')
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const addCard = useAddCard()

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) setPendingPhotos((prev) => [...prev, ...files])
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleAdd() {
    setError('')
    setUploading(false)
    try {
      const itemId = await addCard.mutateAsync({
        cardId: card.id,
        condition,
        quantity,
        foil,
        notes,
        graded,
        grading_company: graded ? gradingCompany : null,
        grade: graded ? grade : null,
        cert_number: graded && certNumber ? certNumber : null,
        cost: cost ? parseFloat(cost) : null,
        price_override: priceOverride ? parseFloat(priceOverride) : null,
        cardData: {
          id: card.id,
          name: card.name,
          set_id: card.set.id,
          set_name: card.set.name,
          number: card.number,
          rarity: card.rarity ?? null,
          supertype: card.supertype ?? null,
          subtypes: card.subtypes ?? null,
          image_small: card.images.small ?? null,
          image_large: card.images.large ?? null,
          hp: card.hp ?? null,
        },
      })
      if (pendingPhotos.length > 0) {
        setUploading(true)
        const paths = await Promise.all(pendingPhotos.map((f) => uploadPhoto(itemId, f)))
        await supabase.from('collection_items').update({ user_photos: paths }).eq('id', itemId)
      }
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add card')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="bg-white border-t-2 border-black px-4 pt-4 max-h-[90vh] overflow-y-auto"
           style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <div className="w-10 h-1 bg-gray-300 mx-auto mb-4" />

        {/* Card header */}
        <div className="flex gap-3 mb-5 border-b-2 border-black pb-4">
          <div className="border-2 border-black flex-shrink-0">
            <CardImage src={card.images.small} alt={card.name} className="w-14" />
          </div>
          <div>
            <div className="font-head font-bold text-black">{card.name}</div>
            <div className="text-sm text-gray-500 font-sans">{card.set.name} · #{card.number}</div>
            {card.rarity && <div className="text-xs text-gray-400 font-sans mt-0.5">{card.rarity}</div>}
          </div>
        </div>

        {/* Graded toggle */}
        <div className="mb-4 flex items-center justify-between py-3 border-2 border-black px-3">
          <div>
            <div className="font-head font-bold text-black text-sm">Professionally Graded</div>
            <div className="text-xs text-gray-500 font-sans">PSA, BGS, or CGC slabbed card</div>
          </div>
          <Toggle value={graded} onChange={setGraded} />
        </div>

        {/* Grading details */}
        {graded && (
          <div className="mb-4 border-2 border-black bg-gray-50 p-3 flex flex-col gap-3">
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Grading Company</div>
              <div className="flex gap-2">
                {GRADING_COMPANIES.map((co) => (
                  <button
                    key={co}
                    type="button"
                    onClick={() => setGradingCompany(co)}
                    className={`flex-1 py-2 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none ${
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
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`w-11 py-1.5 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none ${
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
                placeholder="e.g. 12345678"
                className="w-full bg-white border-2 border-black px-3 py-2 text-sm focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
              />
            </div>
          </div>
        )}

        {/* Condition (only for ungraded) */}
        {!graded && (
          <div className="mb-4">
            <div className="font-head font-bold text-black text-sm mb-2">Condition</div>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`px-3 py-2 text-sm font-head font-bold border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:shadow-none ${
                    condition === c ? 'bg-primary' : 'bg-white'
                  }`}
                >
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <label className="font-head font-bold text-black text-sm">Quantity</label>
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <label className="font-head font-bold text-black text-sm">Foil / Holo</label>
          <Toggle value={foil} onChange={setFoil} />
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="font-head font-bold text-black text-sm mb-2">Pricing <span className="text-xs font-sans font-normal text-gray-400">(optional)</span></div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1 font-sans">Market price override</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="0.01" placeholder="API price"
                  value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)}
                  className="w-full border-2 border-black pl-6 pr-3 py-2 text-sm focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1 font-sans">What you paid</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="0.01" placeholder="Cost"
                  value={cost} onChange={(e) => setCost(e.target.value)}
                  className="w-full border-2 border-black pl-6 pr-3 py-2 text-sm focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="mb-4">
          <div className="font-head font-bold text-black text-sm mb-2">
            Photos <span className="text-xs font-sans font-normal text-gray-400">(optional)</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {pendingPhotos.map((file, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={URL.createObjectURL(file)} alt="" className="w-20 h-28 object-cover border-2 border-black" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
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
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label className="block font-head font-bold text-black text-sm mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            className="w-full border-2 border-black px-3 py-2 text-sm resize-none focus:outline-none shadow-[2px_2px_0px_#000] focus:shadow-none transition-shadow font-sans"
          />
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 border-2 border-black bg-white text-sm font-head font-bold text-black">
            {error}
          </div>
        )}
        <button
          onClick={() => void handleAdd()}
          disabled={addCard.isPending || uploading}
          className="w-full bg-primary border-2 border-black font-head font-bold py-3 text-base shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-2"
        >
          {uploading ? 'Uploading photos…' : addCard.isPending ? 'Adding…' : 'Add to Collection'}
        </button>
      </div>
    </div>
  )
}
