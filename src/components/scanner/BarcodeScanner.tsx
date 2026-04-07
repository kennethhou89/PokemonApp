import { useEffect, useRef } from 'react'
import { useBarcode } from '@/hooks/useBarcode'

interface BarcodeScannerProps {
  onResult: (text: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const divId = 'barcode-scanner-div'
  const started = useRef(false)
  const { start, stop } = useBarcode(onResult)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void start(divId)
    return () => { void stop() }
  }, [start, stop])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white font-medium">Scan Barcode</span>
        <button
          onClick={() => { void stop(); onClose() }}
          className="text-white/80 text-sm"
        >
          Cancel
        </button>
      </div>
      <div id={divId} className="flex-1" />
      <p className="text-white/60 text-xs text-center pb-8 px-4">
        Point camera at the barcode on a booster pack or card
      </p>
    </div>
  )
}
