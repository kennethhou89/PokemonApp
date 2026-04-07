import { useState } from 'react'

export function useSearchHistory(storageKey: string, max = 8) {
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { return [] }
  })
  function push(term: string) {
    const t = term.trim()
    if (!t) return
    setHistory(prev => {
      const next = [t, ...prev.filter(h => h !== t)].slice(0, max)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }
  function remove(term: string) {
    setHistory(prev => {
      const next = prev.filter(h => h !== term)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }
  return { history, push, remove }
}
