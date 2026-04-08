'use client'

import { startTransition, useState } from 'react'
import QuerySummaryCard from '@/components/query-summary-card'
import RetrievalSourceCard from '@/components/retrieval-source-card'
import type { QuerySummary, SearchResponse } from '@/types/retrieval'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse['results']>([])
  const [summary, setSummary] = useState<QuerySummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Search failed.')
      }

      startTransition(() => {
        setResults(data.results || [])
        setSummary(data.summary || null)
      })
    } catch (searchError) {
      const message =
        searchError instanceof Error ? searchError.message : 'Search failed.'

      setSummary(null)
      setResults([])
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl">Search</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Inspect which chunk matched, why it matched, and jump straight into the game.
        </p>

        <div className="mb-6 flex gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
            placeholder="e.g. queenside castle"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="rounded-xl bg-white px-5 text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

        {loading ? (
          <p className="mb-4 text-sm text-zinc-400">Retrieving matching chunks...</p>
        ) : null}

        <div className="space-y-4">
          {summary ? <QuerySummaryCard summary={summary} /> : null}

          {results.map((result) => (
            <RetrievalSourceCard key={result.id} source={result} />
          ))}

          {!loading && !error && results.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
              Run a query to inspect the retrieved sources.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
