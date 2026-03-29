'use client'

import { useState } from 'react'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])

  const handleSearch = async () => {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    const data = await res.json()
    setResults(data.results || [])
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-3xl mb-6">Search</h1>

      <div className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl"
          placeholder="e.g. kingside attack"
        />
        <button
          onClick={handleSearch}
          className="bg-white text-black px-5 rounded-xl"
        >
          Search
        </button>
      </div>

      <div className="space-y-4">
        {results.map((r, i) => (
          <div key={i} className="p-4 bg-zinc-900 rounded-xl">
            <p className="text-sm text-zinc-400">Score: {r.score.toFixed(3)}</p>
            <p className="font-medium">{r.summary}</p>
            <p className="text-sm text-zinc-500">
              {r.game.white} vs {r.game.black}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}