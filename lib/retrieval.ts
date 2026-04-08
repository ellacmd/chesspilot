import { Prisma } from '@/app/generated/prisma/client'
import { embedText } from '@/lib/embed'
import { prisma } from '@/lib/prisma'
import type {
  ParsedQuery,
  QuerySummary,
  RetrievalSource,
  SearchResponse,
} from '@/types/retrieval'

export const MAX_QUERY_LENGTH = 500

type GetTopSourcesOptions = {
  gameIds?: string[]
  limit?: number
  types?: string[]
}

type RepresentativeSourceOptions = {
  gameIds: string[]
  limit?: number
  types?: string[]
  matchReason: string
}

type ChunkWithGame = {
  id: string
  gameId: string
  type: string
  startPly: number
  endPly: number
  summary: string | null
  tags: unknown
  content: string | null
  embedding: unknown
  game: {
    id: string
    white: string
    black: string
    opening: string | null
    eco: string | null
    result: string | null
  }
}

export function normalizeQuery(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const query = value.trim()

  if (!query) {
    return null
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query must be ${MAX_QUERY_LENGTH} characters or fewer.`)
  }

  return query
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0
  }

  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0))

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dot / (magnitudeA * magnitudeB)
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function toNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is number => typeof item === 'number')
}

function collectQueryTerms(query: string) {
  const normalizedQuery = query.toLowerCase()
  const baseTerms = normalizedQuery.match(/[a-z0-9][a-z0-9-]*/g) ?? []
  const specialTerms = ['o-o-o', 'o-o', 'queenside castle', 'kingside castle'].filter(
    (term) => normalizedQuery.includes(term)
  )

  return Array.from(
    new Set(
      [normalizedQuery, ...specialTerms, ...baseTerms].filter(
        (term) => term.length >= 3 || term.includes('o-o')
      )
    )
  )
}

function buildMatchMetadata(query: string, source: Omit<RetrievalSource, 'matchedTerms' | 'matchReason'>) {
  const haystack = [
    source.summary ?? '',
    source.content,
    source.game.white,
    source.game.black,
    source.game.opening ?? '',
    source.game.eco ?? '',
    source.tags.join(' '),
  ]
    .join('\n')
    .toLowerCase()

  const matchedTerms = collectQueryTerms(query)
    .filter((term) => haystack.includes(term))
    .slice(0, 4)

  if (matchedTerms.length > 0) {
    return {
      matchedTerms,
      matchReason: `Matched exact terms in the source: ${matchedTerms.join(', ')}.`,
    }
  }

  return {
    matchedTerms: [],
    matchReason: 'Matched by semantic similarity across the chunk summary, tags, and moves.',
  }
}

function mapChunkToSource(
  chunk: ChunkWithGame,
  query: string,
  score: number,
  matchReasonOverride?: string
): RetrievalSource {
  const baseSource = {
    id: chunk.id,
    score,
    type: chunk.type,
    startPly: chunk.startPly,
    endPly: chunk.endPly,
    summary: chunk.summary,
    content: chunk.content ?? chunk.summary ?? '',
    tags: toStringArray(chunk.tags),
    game: {
      id: chunk.game.id,
      white: chunk.game.white,
      black: chunk.game.black,
      opening: chunk.game.opening,
      eco: chunk.game.eco,
      result: chunk.game.result,
    },
  }

  if (matchReasonOverride) {
    return {
      ...baseSource,
      matchedTerms: [],
      matchReason: matchReasonOverride,
    }
  }

  return {
    ...baseSource,
    ...buildMatchMetadata(query, baseSource),
  }
}

export async function getTopSources(
  query: string,
  options: GetTopSourcesOptions = {}
): Promise<RetrievalSource[]> {
  const { gameIds, limit = 5, types } = options
  const queryEmbedding = await embedText(query)

  const chunks = await prisma.chunk.findMany({
    where: {
      embedding: {
        not: Prisma.DbNull,
      },
      ...(gameIds && gameIds.length > 0
        ? {
            gameId: {
              in: gameIds,
            },
          }
        : {}),
      ...(types && types.length > 0
        ? {
            type: {
              in: types,
            },
          }
        : {}),
    },
    include: {
      game: true,
    },
  })

  return chunks
    .map((chunk) =>
      mapChunkToSource(
        chunk,
        query,
        cosineSimilarity(queryEmbedding, toNumberArray(chunk.embedding))
      )
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}

export async function getRepresentativeSourcesForGames(
  query: string,
  options: RepresentativeSourceOptions
): Promise<RetrievalSource[]> {
  const { gameIds, limit = 5, matchReason, types } = options

  if (gameIds.length === 0) {
    return []
  }

  const chunks = await prisma.chunk.findMany({
    where: {
      gameId: {
        in: gameIds,
      },
      ...(types && types.length > 0
        ? {
            type: {
              in: types,
            },
          }
        : {}),
    },
    include: {
      game: true,
    },
    orderBy: [{ gameId: 'asc' }, { startPly: 'asc' }],
  })

  const firstChunkByGame = new Map<string, ChunkWithGame>()

  for (const chunk of chunks) {
    if (!firstChunkByGame.has(chunk.gameId)) {
      firstChunkByGame.set(chunk.gameId, chunk)
    }
  }

  return gameIds
    .map((gameId, index) => {
      const chunk = firstChunkByGame.get(gameId)

      if (!chunk) {
        return null
      }

      return mapChunkToSource(
        chunk,
        query,
        Number((1 - index * 0.01).toFixed(2)),
        matchReason
      )
    })
    .filter((source): source is RetrievalSource => source !== null)
    .slice(0, limit)
}

function serializeSummary(summary: QuerySummary) {
  switch (summary.intent) {
    case 'repertoire_aggregate':
      return `[Structured Summary]
Intent: ${summary.intent}
Title: ${summary.title}
Summary: ${summary.summary}
Confidence: ${summary.confidence}
Games matched: ${summary.totalGames}
${summary.caveat ? `Caveat: ${summary.caveat}` : ''}
Route reason: ${summary.routeReason}
Top openings:
${summary.topOpenings
  .map(
    (opening, index) =>
      `${index + 1}. ${opening.opening}${opening.eco ? ` (${opening.eco})` : ''} - ${opening.count} games (${opening.percentage}%)`
  )
  .join('\n')}`
    case 'comparative':
      return `[Structured Summary]
Intent: ${summary.intent}
Title: ${summary.title}
Summary: ${summary.summary}
Confidence: ${summary.confidence}
${summary.caveat ? `Caveat: ${summary.caveat}` : ''}
Route reason: ${summary.routeReason}
Left side:
${summary.left.playerTerm}: ${summary.left.totalGames} games
${summary.left.topOpenings
  .map(
    (opening, index) =>
      `${index + 1}. ${opening.opening}${opening.eco ? ` (${opening.eco})` : ''} - ${opening.count} games (${opening.percentage}%)`
  )
  .join('\n')}
Right side:
${summary.right.playerTerm}: ${summary.right.totalGames} games
${summary.right.topOpenings
  .map(
    (opening, index) =>
      `${index + 1}. ${opening.opening}${opening.eco ? ` (${opening.eco})` : ''} - ${opening.count} games (${opening.percentage}%)`
  )
  .join('\n')}
Key differences:
${summary.keyDifferences.join('\n')}`
    case 'trend':
      return `[Structured Summary]
Intent: ${summary.intent}
Title: ${summary.title}
Summary: ${summary.summary}
Confidence: ${summary.confidence}
${summary.caveat ? `Caveat: ${summary.caveat}` : ''}
Route reason: ${summary.routeReason}
Buckets:
${summary.buckets
  .map(
    (bucket) =>
      `${bucket.label}: ${bucket.totalGames} games\n${bucket.topOpenings
        .map(
          (opening, index) =>
            `${index + 1}. ${opening.opening}${opening.eco ? ` (${opening.eco})` : ''} - ${opening.count} games (${opening.percentage}%)`
        )
        .join('\n')}`
  )
  .join('\n\n')}`
    case 'negative_evidence':
      return `[Structured Summary]
Intent: ${summary.intent}
Title: ${summary.title}
Summary: ${summary.summary}
Confidence: ${summary.confidence}
Verdict: ${summary.verdict}
Games matched: ${summary.totalGames}
Opening matches: ${summary.matchingGames}
${summary.caveat ? `Caveat: ${summary.caveat}` : ''}
Route reason: ${summary.routeReason}`
    case 'position_lookup':
      return `[Structured Summary]
Intent: ${summary.intent}
Title: ${summary.title}
Summary: ${summary.summary}
FEN: ${summary.fen}
Matching positions: ${summary.totalPositions}
Games matched: ${summary.totalGames}
${summary.caveat ? `Caveat: ${summary.caveat}` : ''}
Route reason: ${summary.routeReason}`
    case 'counterfactual':
      return `[Structured Summary]
Intent: ${summary.intent}
Title: ${summary.title}
Summary: ${summary.summary}
${summary.caveat ? `Caveat: ${summary.caveat}` : ''}
Route reason: ${summary.routeReason}
${summary.suggestedAlternative ? `Suggested alternative: ${summary.suggestedAlternative}` : ''}`
    default:
      return ''
  }
}

export function buildAskContext(args: {
  sources: RetrievalSource[]
  parsedQuery: ParsedQuery
  summary?: QuerySummary | null
}) {
  const { parsedQuery, sources, summary } = args
  const sections: string[] = [
    `Query intent: ${parsedQuery.intent}`,
    `Routing reason: ${parsedQuery.routeReason}`,
  ]

  if (summary) {
    sections.push(serializeSummary(summary))
  }

  sections.push(
    sources
      .map(
        (source, index) => `[Source ${index + 1}]
Game: ${source.game.white} vs ${source.game.black}
Opening: ${source.game.opening ?? 'Unknown opening'}${source.game.eco ? ` (${source.game.eco})` : ''}
Chunk Type: ${source.type}
Ply Range: ${source.startPly} to ${source.endPly}
Why it matched: ${source.matchReason}
Content:
${source.content}`
      )
      .join('\n\n')
  )

  return sections.join('\n\n')
}

export function buildSearchResponse(args: {
  parsedQuery: ParsedQuery
  summary?: QuerySummary | null
  results: RetrievalSource[]
}): SearchResponse {
  const { parsedQuery, results, summary = null } = args

  return {
    intent: parsedQuery.intent,
    parsedQuery,
    summary,
    results,
  }
}

export function encodeStreamEvent(event: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`)
}
