import { prisma } from '@/lib/prisma'
import { getRepresentativeSourcesForGames } from '@/lib/retrieval'
import type {
  AggregateOpeningStat,
  AggregateSummary,
  ComparisonSide,
  ComparisonSummary,
  Confidence,
  NegativeEvidenceSummary,
  ParsedQuery,
  PositionSummary,
  QuerySummary,
  RetrievalSource,
  TrendBucket,
  TrendSummary,
} from '@/types/retrieval'

type MatchingGame = {
  id: string
  white: string
  black: string
  opening: string | null
  eco: string | null
  result: string | null
  playedAt: Date | null
}

type StructuredQueryResult = {
  summary: QuerySummary
  results: RetrievalSource[]
}

function normalizeOpeningLabel(opening: string | null) {
  return opening?.trim() || 'Unknown opening'
}

function buildConfidence(totalGames: number): Confidence {
  if (totalGames >= 12) {
    return 'high'
  }

  if (totalGames >= 5) {
    return 'medium'
  }

  return 'low'
}

function buildOpeningStats(games: MatchingGame[]) {
  const buckets = new Map<string, { opening: string; eco: string | null; count: number }>()

  for (const game of games) {
    const opening = normalizeOpeningLabel(game.opening)
    const eco = game.eco ?? null
    const key = `${opening}::${eco ?? 'unknown'}`
    const existing = buckets.get(key)

    if (existing) {
      existing.count += 1
      continue
    }

    buckets.set(key, { opening, eco, count: 1 })
  }

  return Array.from(buckets.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 3)
    .map(
      (item): AggregateOpeningStat => ({
        opening: item.opening,
        eco: item.eco,
        count: item.count,
        percentage: Number(((item.count / games.length) * 100).toFixed(1)),
      })
    )
}

function buildCaveat(totalGames: number, openingFilter: string | null) {
  if (totalGames >= 5) {
    return null
  }

  if (openingFilter) {
    return `Only ${totalGames} matching games were found after applying the opening filter.`
  }

  return `Only ${totalGames} matching games were found in the current corpus.`
}

function pickRepresentativeGameIds(games: MatchingGame[], topOpenings: AggregateOpeningStat[]) {
  const selectedIds: string[] = []

  for (const opening of topOpenings) {
    const game = games.find(
      (candidate) =>
        normalizeOpeningLabel(candidate.opening) === opening.opening &&
        (candidate.eco ?? null) === opening.eco
    )

    if (game && !selectedIds.includes(game.id)) {
      selectedIds.push(game.id)
    }
  }

  for (const game of games) {
    if (selectedIds.length >= 5) {
      break
    }

    if (!selectedIds.includes(game.id)) {
      selectedIds.push(game.id)
    }
  }

  return selectedIds
}

async function getRepresentativeSources(query: string, gameIds: string[], reason: string) {
  let results = await getRepresentativeSourcesForGames(query, {
    gameIds,
    limit: 5,
    types: ['opening'],
    matchReason: reason,
  })

  if (results.length === 0) {
    results = await getRepresentativeSourcesForGames(query, {
      gameIds,
      limit: 5,
      matchReason: reason,
    })
  }

  return results
}

async function findGamesByPlayer(
  playerTerm: string,
  color: 'white' | 'black',
  openingFilter: string | null
) {
  return prisma.game.findMany({
    where: {
      [color]: {
        contains: playerTerm,
        mode: 'insensitive',
      },
      ...(openingFilter
        ? {
            opening: {
              contains: openingFilter,
              mode: 'insensitive',
            },
          }
        : {}),
    },
    select: {
      id: true,
      white: true,
      black: true,
      opening: true,
      eco: true,
      result: true,
      playedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

async function buildAggregateRoute(
  query: string,
  parsedQuery: ParsedQuery
): Promise<StructuredQueryResult | null> {
  if (
    parsedQuery.intent !== 'repertoire_aggregate' ||
    !parsedQuery.playerTerm ||
    !parsedQuery.color
  ) {
    return null
  }

  const games = await findGamesByPlayer(
    parsedQuery.playerTerm,
    parsedQuery.color,
    parsedQuery.openingFilter
  )

  if (games.length === 0) {
    return null
  }

  const topOpenings = buildOpeningStats(games)
  const summary: AggregateSummary = {
    intent: 'repertoire_aggregate',
    title: `${parsedQuery.playerTerm} as ${parsedQuery.color}`,
    playerTerm: parsedQuery.playerTerm,
    color: parsedQuery.color,
    totalGames: games.length,
    openingFilter: parsedQuery.openingFilter,
    topOpenings,
    confidence: buildConfidence(games.length),
    summary: `${parsedQuery.playerTerm} appears in ${games.length} ${parsedQuery.color} games in this corpus. Top openings: ${topOpenings
      .map((opening) => `${opening.opening}${opening.eco ? ` (${opening.eco})` : ''} ${opening.count}/${games.length}`)
      .join(', ')}.`,
    caveat: buildCaveat(games.length, parsedQuery.openingFilter),
    routeReason: parsedQuery.routeReason,
  }

  const gameIds = pickRepresentativeGameIds(games, topOpenings)
  const results = await getRepresentativeSources(
    query,
    gameIds,
    'Selected as a representative source from the structured repertoire result.'
  )

  return { summary, results }
}

function buildComparisonDifferences(left: ComparisonSide, right: ComparisonSide) {
  const leftTop = left.topOpenings[0]
  const rightTop = right.topOpenings[0]
  const differences: string[] = []

  if (leftTop && rightTop && leftTop.opening !== rightTop.opening) {
    differences.push(
      `${left.playerTerm} most often reaches ${leftTop.opening}, while ${right.playerTerm} most often reaches ${rightTop.opening}.`
    )
  }

  const leftNames = new Set(left.topOpenings.map((opening) => opening.opening))
  const rightNames = new Set(right.topOpenings.map((opening) => opening.opening))
  const uniqueLeft = Array.from(leftNames).find((name) => !rightNames.has(name))
  const uniqueRight = Array.from(rightNames).find((name) => !leftNames.has(name))

  if (uniqueLeft) {
    differences.push(`${uniqueLeft} appears in ${left.playerTerm}'s top results but not ${right.playerTerm}'s.`)
  }

  if (uniqueRight) {
    differences.push(`${uniqueRight} appears in ${right.playerTerm}'s top results but not ${left.playerTerm}'s.`)
  }

  return differences.length > 0
    ? differences
    : ['The top opening distributions are similar in the current corpus.']
}

async function buildComparisonRoute(
  query: string,
  parsedQuery: ParsedQuery
): Promise<StructuredQueryResult | null> {
  if (
    parsedQuery.intent !== 'comparative' ||
    !parsedQuery.playerTerm ||
    !parsedQuery.secondPlayerTerm ||
    !parsedQuery.color
  ) {
    return null
  }

  const [leftGames, rightGames] = await Promise.all([
    findGamesByPlayer(parsedQuery.playerTerm, parsedQuery.color, parsedQuery.openingFilter),
    findGamesByPlayer(parsedQuery.secondPlayerTerm, parsedQuery.color, parsedQuery.openingFilter),
  ])

  if (leftGames.length === 0 || rightGames.length === 0) {
    return null
  }

  const left: ComparisonSide = {
    playerTerm: parsedQuery.playerTerm,
    totalGames: leftGames.length,
    topOpenings: buildOpeningStats(leftGames),
  }

  const right: ComparisonSide = {
    playerTerm: parsedQuery.secondPlayerTerm,
    totalGames: rightGames.length,
    topOpenings: buildOpeningStats(rightGames),
  }

  const keyDifferences = buildComparisonDifferences(left, right)
  const confidence = buildConfidence(Math.min(left.totalGames, right.totalGames))
  const summary: ComparisonSummary = {
    intent: 'comparative',
    title: `${left.playerTerm} vs ${right.playerTerm} as ${parsedQuery.color}`,
    summary: `Compared ${left.totalGames} ${parsedQuery.color} games for ${left.playerTerm} and ${right.totalGames} for ${right.playerTerm}.`,
    caveat:
      left.totalGames < 5 || right.totalGames < 5
        ? 'At least one side has a small sample in the current corpus.'
        : null,
    routeReason: parsedQuery.routeReason,
    color: parsedQuery.color,
    openingFilter: parsedQuery.openingFilter,
    confidence,
    left,
    right,
    keyDifferences,
  }

  const gameIds = [
    ...pickRepresentativeGameIds(leftGames, left.topOpenings).slice(0, 3),
    ...pickRepresentativeGameIds(rightGames, right.topOpenings).slice(0, 3),
  ]

  const results = await getRepresentativeSources(
    query,
    Array.from(new Set(gameIds)),
    'Selected as a representative source from the structured comparison result.'
  )

  return { summary, results }
}

async function buildTrendRoute(
  query: string,
  parsedQuery: ParsedQuery
): Promise<StructuredQueryResult | null> {
  if (
    parsedQuery.intent !== 'trend' ||
    !parsedQuery.playerTerm ||
    !parsedQuery.color
  ) {
    return null
  }

  const games = await findGamesByPlayer(
    parsedQuery.playerTerm,
    parsedQuery.color,
    parsedQuery.openingFilter
  )
  const datedGames = games.filter((game) => game.playedAt !== null)

  if (datedGames.length < 2) {
    return null
  }

  const orderedGames = [...datedGames].sort(
    (left, right) =>
      (left.playedAt?.getTime() ?? 0) - (right.playedAt?.getTime() ?? 0)
  )
  const splitIndex = Math.ceil(orderedGames.length / 2)
  const earlierGames = orderedGames.slice(0, splitIndex)
  const recentGames = orderedGames.slice(splitIndex)

  if (earlierGames.length === 0 || recentGames.length === 0) {
    return null
  }

  const buckets: TrendBucket[] = [
    {
      label: 'Earlier sample',
      totalGames: earlierGames.length,
      topOpenings: buildOpeningStats(earlierGames),
    },
    {
      label: 'Recent sample',
      totalGames: recentGames.length,
      topOpenings: buildOpeningStats(recentGames),
    },
  ]

  const confidence = buildConfidence(Math.min(earlierGames.length, recentGames.length))
  const earlierTop = buckets[0].topOpenings[0]?.opening ?? 'unknown'
  const recentTop = buckets[1].topOpenings[0]?.opening ?? 'unknown'
  const summary: TrendSummary = {
    intent: 'trend',
    title: `${parsedQuery.playerTerm} trend as ${parsedQuery.color}`,
    playerTerm: parsedQuery.playerTerm,
    color: parsedQuery.color,
    openingFilter: parsedQuery.openingFilter,
    confidence,
    summary: `The earlier dated sample is led by ${earlierTop}, while the recent sample is led by ${recentTop}.`,
    caveat:
      orderedGames.length < 6
        ? 'The dated sample is small, so treat the trend as provisional.'
        : null,
    routeReason: parsedQuery.routeReason,
    buckets,
  }

  const gameIds = [
    ...pickRepresentativeGameIds(earlierGames, buckets[0].topOpenings).slice(0, 2),
    ...pickRepresentativeGameIds(recentGames, buckets[1].topOpenings).slice(0, 2),
  ]

  const results = await getRepresentativeSources(
    query,
    Array.from(new Set(gameIds)),
    'Selected as a representative source from the structured trend result.'
  )

  return { summary, results }
}

async function buildNegativeEvidenceRoute(
  query: string,
  parsedQuery: ParsedQuery
): Promise<StructuredQueryResult | null> {
  if (
    parsedQuery.intent !== 'negative_evidence' ||
    !parsedQuery.playerTerm ||
    !parsedQuery.color ||
    !parsedQuery.openingFilter
  ) {
    return null
  }

  const allGames = await findGamesByPlayer(parsedQuery.playerTerm, parsedQuery.color, null)

  if (allGames.length === 0) {
    return null
  }

  const matchingGames = allGames.filter((game) =>
    normalizeOpeningLabel(game.opening)
      .toLowerCase()
      .includes(parsedQuery.openingFilter!.toLowerCase())
  )

  const confidence = buildConfidence(allGames.length)
  const verdict =
    matchingGames.length > 0
      ? 'present'
      : allGames.length >= 5
      ? 'absent'
      : 'insufficient'

  const summary: NegativeEvidenceSummary = {
    intent: 'negative_evidence',
    title: `${parsedQuery.playerTerm} and ${parsedQuery.openingFilter}`,
    playerTerm: parsedQuery.playerTerm,
    color: parsedQuery.color,
    openingFilter: parsedQuery.openingFilter,
    totalGames: allGames.length,
    matchingGames: matchingGames.length,
    confidence,
    verdict,
    summary:
      matchingGames.length > 0
        ? `${parsedQuery.playerTerm} does play ${parsedQuery.openingFilter} as ${parsedQuery.color} in this corpus: ${matchingGames.length} of ${allGames.length} games.`
        : verdict === 'absent'
        ? `${parsedQuery.playerTerm} does not appear to play ${parsedQuery.openingFilter} as ${parsedQuery.color} in this corpus.`
        : `The current corpus is too small to make a strong claim about whether ${parsedQuery.playerTerm} plays ${parsedQuery.openingFilter} as ${parsedQuery.color}.`,
    caveat:
      verdict === 'insufficient'
        ? 'Absence in a small corpus is not proof of avoidance.'
        : null,
    routeReason: parsedQuery.routeReason,
  }

  const representativeGames = matchingGames.length > 0 ? matchingGames : allGames
  const gameIds = pickRepresentativeGameIds(
    representativeGames,
    buildOpeningStats(representativeGames)
  ).slice(0, 5)

  const results = await getRepresentativeSources(
    query,
    gameIds,
    'Selected as a representative source from the structured negative-evidence result.'
  )

  return { summary, results }
}

async function buildPositionRoute(
  query: string,
  parsedQuery: ParsedQuery
): Promise<StructuredQueryResult | null> {
  if (parsedQuery.intent !== 'position_lookup' || !parsedQuery.fen) {
    return null
  }

  const positions = await prisma.position.findMany({
    where: {
      fen: parsedQuery.fen,
    },
    select: {
      gameId: true,
    },
    take: 20,
  })

  if (positions.length === 0) {
    return null
  }

  const gameIds = Array.from(new Set(positions.map((position) => position.gameId)))
  const summary: PositionSummary = {
    intent: 'position_lookup',
    title: 'Exact position lookup',
    fen: parsedQuery.fen,
    totalPositions: positions.length,
    totalGames: gameIds.length,
    summary: `Found ${positions.length} exact position matches across ${gameIds.length} games.`,
    caveat: null,
    routeReason: parsedQuery.routeReason,
  }

  const results = await getRepresentativeSources(
    query,
    gameIds.slice(0, 5),
    'Selected from games containing the exact requested FEN.'
  )

  return { summary, results }
}

function buildCounterfactualRoute(parsedQuery: ParsedQuery): StructuredQueryResult | null {
  if (parsedQuery.intent !== 'counterfactual') {
    return null
  }

  return {
    summary: {
      intent: 'counterfactual',
      title: 'Counterfactual or opinion query',
      summary:
        'The current corpus can describe observed patterns, but it cannot directly prove a counterfactual or objective claim.',
      caveat: 'This question is better answered by reframing it as an evidence-based lookup or aggregate query.',
      routeReason: parsedQuery.routeReason,
      suggestedAlternative:
        'Try asking for observed games, repertoire frequencies, or trends instead.',
    },
    results: [],
  }
}

export async function getStructuredQueryResult(
  query: string,
  parsedQuery: ParsedQuery
): Promise<StructuredQueryResult | null> {
  const counterfactual = buildCounterfactualRoute(parsedQuery)

  if (counterfactual) {
    return counterfactual
  }

  const aggregate = await buildAggregateRoute(query, parsedQuery)

  if (aggregate) {
    return aggregate
  }

  const comparison = await buildComparisonRoute(query, parsedQuery)

  if (comparison) {
    return comparison
  }

  const trend = await buildTrendRoute(query, parsedQuery)

  if (trend) {
    return trend
  }

  const negativeEvidence = await buildNegativeEvidenceRoute(query, parsedQuery)

  if (negativeEvidence) {
    return negativeEvidence
  }

  const position = await buildPositionRoute(query, parsedQuery)

  if (position) {
    return position
  }

  return null
}
