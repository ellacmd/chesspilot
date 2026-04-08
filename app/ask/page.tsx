'use client'

import { startTransition, useState } from 'react'
import QuerySummaryCard from '@/components/query-summary-card'
import RetrievalSourceCard from '@/components/retrieval-source-card'
import { parseAskStreamEvents } from '@/lib/ask-stream'
import type { AskStreamEvent, QuerySummary, RetrievalSource } from '@/types/retrieval'

export default function AskPage() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [summary, setSummary] = useState<QuerySummary | null>(null)
  const [sources, setSources] = useState<RetrievalSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const applyStreamEvent = (event: AskStreamEvent) => {
    if (event.type === 'summary') {
      startTransition(() => {
        setSummary(event.summary)
      })
      return
    }

    if (event.type === 'sources') {
      startTransition(() => {
        setSources(event.sources)
      })
      return
    }

    if (event.type === 'answer-delta') {
      setAnswer((current) => current + event.delta)
      return
    }

    if (event.type === 'error') {
      setError(event.error)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  const handleAsk = async () => {
    setLoading(true)
    setAnswer('')
    setSummary(null)
    setSources([])
    setError('')

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No response')
      }

      const reader = res.body?.getReader()

      if (!reader) {
        throw new Error('The answer stream was unavailable.')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        buffer = parseAskStreamEvents(buffer, applyStreamEvent)
      }

      if (buffer.trim()) {
        applyStreamEvent(JSON.parse(buffer.trim()) as AskStreamEvent)
      }
    } catch (askError) {
      const message =
        askError instanceof Error ? askError.message : 'Failed to get an answer.'

      setError(message)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl">Ask Pawnalyze</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Answers stream in live and each response includes inspectable supporting sources.
        </p>

        <div className="mb-6 flex gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about chess..."
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
          />

          <button
            onClick={handleAsk}
            disabled={loading}
            className="rounded-xl bg-white px-5 text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Streaming...' : 'Ask'}
          </button>
        </div>

        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

        {loading && !answer ? (
          <p className="mb-4 text-zinc-400">Retrieving sources and starting the answer...</p>
        ) : null}

        {answer ? (
          <div className="mt-6 rounded-xl bg-zinc-900 p-4">
            <p className="whitespace-pre-wrap">{answer}</p>
          </div>
        ) : null}

        {summary ? (
          <div className="mt-8">
            <QuerySummaryCard summary={summary} />
          </div>
        ) : null}

        {sources.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-lg font-medium">Sources</h2>
            <div className="mt-4 space-y-4">
              {sources.map((source, index) => (
                <RetrievalSourceCard
                  key={source.id}
                  source={source}
                  title={`Source ${index + 1} · ${source.type}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
