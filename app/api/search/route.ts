import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { embedText } from '@/lib/embed'

function cosineSimilarity(a: number[], b: number[]) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)

  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

  return dot / (magA * magB)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const query = body?.query

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  const queryEmbedding = await embedText(query)

  const chunks = await prisma.chunk.findMany({
    where: {
      embedding: {
        not: Prisma.DbNull,
      },
    },
    include: {
      game: true,
    },
  })

  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(
      queryEmbedding,
      chunk.embedding as number[]
    ),
  }))

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return NextResponse.json({
    results: top.map((item) => ({
      score: item.score,
      summary: item.chunk.summary,
      type: item.chunk.type,
      game: {
        id: item.chunk.game.id,
        white: item.chunk.game.white,
        black: item.chunk.game.black,
      },
    })),
  })
}