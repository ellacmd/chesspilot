import { NextRequest, NextResponse } from 'next/server'
import { toErrorStatus } from '@/lib/ask-stream'
import { getStructuredQueryResult } from '@/lib/game-analytics'
import { parseQuery } from '@/lib/query-routing'
import { buildSearchResponse, getTopSources, normalizeQuery } from '@/lib/retrieval'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = normalizeQuery(body?.query)

    if (!query) {
      return NextResponse.json({ error: 'Query required.' }, { status: 400 })
    }

    const parsedQuery = parseQuery(query)
    const structuredResult = await getStructuredQueryResult(query, parsedQuery)

    if (structuredResult) {
      return NextResponse.json(
        buildSearchResponse({
          parsedQuery,
          summary: structuredResult.summary,
          results: structuredResult.results,
        })
      )
    }

    const results = await getTopSources(query)

    return NextResponse.json(
      buildSearchResponse({
        parsedQuery,
        results,
      })
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to search the corpus.'
    const status = toErrorStatus(message)

    return NextResponse.json({ error: message }, { status })
  }
}
