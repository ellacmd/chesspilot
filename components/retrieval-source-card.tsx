import Link from 'next/link'
import type { RetrievalSource } from '@/types/retrieval'

type RetrievalSourceCardProps = {
  source: RetrievalSource
  title?: string
  showScore?: boolean
}

export default function RetrievalSourceCard({
  source,
  title,
  showScore = true,
}: RetrievalSourceCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            {title ?? source.type}
          </p>
          <h3 className="mt-2 text-lg font-medium">
            {source.game.white} vs {source.game.black}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {source.game.opening ?? 'Unknown opening'}
            {source.game.eco ? ` (${source.game.eco})` : ''}
          </p>
        </div>

        {showScore ? (
          <div className="text-sm text-zinc-400">Score: {source.score.toFixed(3)}</div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
        <span>Ply {source.startPly} to {source.endPly}</span>
        <span>Result: {source.game.result ?? 'Unknown'}</span>
      </div>

      <p className="mt-4 text-sm text-zinc-300">{source.summary}</p>
      <p className="mt-3 text-sm text-emerald-300">{source.matchReason}</p>

      {source.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {source.tags.map((tag) => (
            <span
              key={`${source.id}-${tag}`}
              className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm whitespace-pre-wrap text-zinc-300">
        {source.content}
      </pre>

      <div className="mt-4">
        <Link
          href={`/games/${source.game.id}`}
          className="text-sm font-medium text-zinc-100 underline-offset-4 hover:underline"
        >
          Open game detail
        </Link>
      </div>
    </article>
  )
}
