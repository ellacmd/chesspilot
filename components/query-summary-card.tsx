import type { QuerySummary } from '@/types/retrieval'

type QuerySummaryCardProps = {
  summary: QuerySummary
}

function renderOpeningStats(items: Array<{ opening: string; eco: string | null; count: number; percentage: number }>) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">No opening distribution available.</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((opening) => (
        <div
          key={`${opening.opening}-${opening.eco ?? 'unknown'}`}
          className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4"
        >
          <p className="text-sm font-medium text-zinc-100">{opening.opening}</p>
          <p className="mt-1 text-xs text-zinc-500">{opening.eco ?? 'No ECO'}</p>
          <p className="mt-3 text-sm text-zinc-300">{opening.count} games</p>
          <p className="text-xs text-zinc-500">{opening.percentage}%</p>
        </div>
      ))}
    </div>
  )
}

export default function QuerySummaryCard({ summary }: QuerySummaryCardProps) {
  return (
    <section className="rounded-2xl border border-emerald-900/40 bg-emerald-950/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
        {summary.intent.replace(/_/g, ' ')}
      </p>
      <h2 className="mt-2 text-xl font-medium text-zinc-100">{summary.title}</h2>
      <p className="mt-2 text-sm text-zinc-300">{summary.summary}</p>
      <p className="mt-3 text-sm text-emerald-300">{summary.routeReason}</p>

      {'confidence' in summary ? (
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
          <span>Confidence: {summary.confidence}</span>
          {'totalGames' in summary ? <span>Games matched: {summary.totalGames}</span> : null}
          {'openingFilter' in summary && summary.openingFilter ? (
            <span>Opening filter: {summary.openingFilter}</span>
          ) : null}
        </div>
      ) : null}

      {'totalPositions' in summary ? (
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
          <span>Matching positions: {summary.totalPositions}</span>
          <span>Games matched: {summary.totalGames}</span>
        </div>
      ) : null}

      {summary.caveat ? (
        <p className="mt-4 text-sm text-amber-300">{summary.caveat}</p>
      ) : null}

      {'topOpenings' in summary ? (
        <div className="mt-5">{renderOpeningStats(summary.topOpenings)}</div>
      ) : null}

      {'left' in summary ? (
        <div className="mt-5 space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-100">{summary.left.playerTerm}</h3>
            {renderOpeningStats(summary.left.topOpenings)}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-100">{summary.right.playerTerm}</h3>
            {renderOpeningStats(summary.right.topOpenings)}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-100">Key differences</h3>
            <div className="space-y-2 text-sm text-zinc-300">
              {summary.keyDifferences.map((difference) => (
                <p key={difference}>{difference}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {'buckets' in summary ? (
        <div className="mt-5 space-y-4">
          {summary.buckets.map((bucket) => (
            <div key={bucket.label}>
              <h3 className="mb-3 text-sm font-medium text-zinc-100">
                {bucket.label} · {bucket.totalGames} games
              </h3>
              {renderOpeningStats(bucket.topOpenings)}
            </div>
          ))}
        </div>
      ) : null}

      {'verdict' in summary ? (
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-400">
          <span>Verdict: {summary.verdict}</span>
          <span>Opening matches: {summary.matchingGames}</span>
        </div>
      ) : null}

      {'fen' in summary ? (
        <pre className="mt-5 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs whitespace-pre-wrap text-zinc-300">
          {summary.fen}
        </pre>
      ) : null}

      {'suggestedAlternative' in summary && summary.suggestedAlternative ? (
        <p className="mt-5 text-sm text-zinc-300">
          Suggested alternative: {summary.suggestedAlternative}
        </p>
      ) : null}
    </section>
  )
}
