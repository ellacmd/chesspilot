import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import GameViewer from '@/components/game-viewer'

type GameDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const { id } = await params

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      positions: {
        orderBy: {
          ply: 'asc',
        },
      },
      chunks: {
        orderBy: {
          startPly: 'asc',
        },
      },
    },
  })

  if (!game) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-zinc-400">
            Day 8
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            {game.white} vs {game.black}
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
            {game.opening ?? 'Unknown opening'} · {game.result ?? 'Unknown result'}
          </p>
        </div>

        <GameViewer
          game={{
            id: game.id,
            white: game.white,
            black: game.black,
            opening: game.opening,
            result: game.result,
            movesJson: Array.isArray(game.movesJson)
              ? game.movesJson.filter((m): m is string => typeof m === 'string')
              : [],
            positions: game.positions.map((position) => ({
              id: position.id,
              ply: position.ply,
              fen: position.fen,
              san: position.san,
              uci: position.uci,
              sideToMove: position.sideToMove,
            })),
            chunks: game.chunks.map((chunk) => ({
              id: chunk.id,
              type: chunk.type,
              startPly: chunk.startPly,
              endPly: chunk.endPly,
              summary: chunk.summary,
              tags: Array.isArray(chunk.tags)
                ? chunk.tags.filter((t): t is string => typeof t === 'string')
                : [],
            })),
          }}
        />
      </div>
    </main>
  )
}