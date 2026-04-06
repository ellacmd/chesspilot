'use client'

import { useState } from 'react'

export default function AskPage() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAsk = async () => {
    setLoading(true)
    setAnswer('')

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    const data = await res.json()

    setAnswer(data.answer || 'No response')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-3xl mb-6">Ask Pawnalyze</h1>

      <div className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about chess..."
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl"
        />

        <button
          onClick={handleAsk}
          className="bg-white text-black px-5 rounded-xl"
        >
          Ask
        </button>
      </div>

      {loading && <p className="text-zinc-400">Thinking...</p>}

      {answer && (
        <div className="mt-6 p-4 bg-zinc-900 rounded-xl">
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </main>
  )
}