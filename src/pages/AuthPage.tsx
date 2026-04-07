import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">
          <svg viewBox="0 0 100 100" className="w-14 h-14 mx-auto">
            <circle cx="50" cy="50" r="48" fill="#fff" stroke="#222" strokeWidth="4"/>
            <path d="M2 50 H98" stroke="#222" strokeWidth="4"/>
            <path d="M2 50 A48 48 0 0 1 98 50" fill="#ef4444"/>
            <circle cx="50" cy="50" r="14" fill="#fff" stroke="#222" strokeWidth="4"/>
            <circle cx="50" cy="50" r="7" fill="#222"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">PokeCards</h1>
        <p className="text-gray-500 text-sm mt-1">Your Pokemon card inventory</p>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="text-4xl mb-4">&#128231;</div>
          <h2 className="font-semibold text-gray-900 mb-1">Check your email</h2>
          <p className="text-sm text-gray-500">We sent a magic link to <strong>{email}</strong></p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-sm text-red-500 font-medium"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="w-full max-w-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            No password needed. We'll email you a sign-in link.
          </p>
        </form>
      )}
    </div>
  )
}
