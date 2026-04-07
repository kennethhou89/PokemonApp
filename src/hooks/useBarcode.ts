import { useRef, useCallback } from 'react'

export function useBarcode(onResult: (text: string) => void) {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)

  const start = useCallback(
    async (elementId: string) => {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onResult(decodedText)
          void stop()
        },
        () => { /* scan failure, ignore */ }
      )
    },
    [onResult]
  )

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }
  }, [])

  return { start, stop }
}
