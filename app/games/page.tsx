import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function GamesPage() {
  const games = await prisma.game.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  })

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-zinc-400">
              Day 6
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Games
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Browse ingested games and open a full move-by-move board replay.
            </p>
          </div>

          <Link
            href="/ingest"
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Ingest PGN
          </Link>
        </div>

        {games.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
            No games yet. Ingest a PGN first.
          </div>
        ) : (
          <div className="grid gap-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700 hover:bg-zinc-900/80"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-zinc-100">
                      {game.white} vs {game.black}
                    </h2>
                    <p className="text-sm text-zinc-400">
                      {game.opening ?? 'Unknown opening'}
                    </p>
                  </div>

                  <div className="text-sm text-zinc-500">
                    {game.result ?? 'Unknown result'}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>ECO: {game.eco ?? '—'}</span>
                  <span>White Elo: {game.whiteElo ?? '—'}</span>
                  <span>Black Elo: {game.blackElo ?? '—'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}