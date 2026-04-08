export type QueryIntent =
  | 'source_lookup'
  | 'repertoire_aggregate'
  | 'comparative'
  | 'trend'
  | 'negative_evidence'
  | 'position_lookup'
  | 'counterfactual'

export type RetrievalGameRef = {
  id: string
  white: string
  black: string
  opening: string | null
  eco: string | null
  result: string | null
}

export type RetrievalSource = {
  id: string
  score: number
  type: string
  startPly: number
  endPly: number
  summary: string | null
  content: string
  tags: string[]
  matchedTerms: string[]
  matchReason: string
  game: RetrievalGameRef
}

export type ParsedQuery = {
  raw: string
  intent: QueryIntent
  playerTerm: string | null
  secondPlayerTerm: string | null
  color: 'white' | 'black' | null
  openingFilter: string | null
  fen: string | null
  routeReason: string
}

export type AggregateOpeningStat = {
  opening: string
  eco: string | null
  count: number
  percentage: number
}

export type Confidence = 'high' | 'medium' | 'low'

type SummaryBase = {
  intent: QueryIntent
  title: string
  summary: string
  caveat: string | null
  routeReason: string
}

export type AggregateSummary = SummaryBase & {
  intent: 'repertoire_aggregate'
  playerTerm: string
  color: 'white' | 'black'
  totalGames: number
  openingFilter: string | null
  topOpenings: AggregateOpeningStat[]
  confidence: Confidence
}

export type ComparisonSide = {
  playerTerm: string
  totalGames: number
  topOpenings: AggregateOpeningStat[]
}

export type ComparisonSummary = SummaryBase & {
  intent: 'comparative'
  color: 'white' | 'black'
  openingFilter: string | null
  confidence: Confidence
  left: ComparisonSide
  right: ComparisonSide
  keyDifferences: string[]
}

export type TrendBucket = {
  label: string
  totalGames: number
  topOpenings: AggregateOpeningStat[]
}

export type TrendSummary = SummaryBase & {
  intent: 'trend'
  playerTerm: string
  color: 'white' | 'black'
  openingFilter: string | null
  confidence: Confidence
  buckets: TrendBucket[]
}

export type NegativeEvidenceSummary = SummaryBase & {
  intent: 'negative_evidence'
  playerTerm: string
  color: 'white' | 'black'
  openingFilter: string
  totalGames: number
  matchingGames: number
  confidence: Confidence
  verdict: 'present' | 'absent' | 'insufficient'
}

export type PositionSummary = SummaryBase & {
  intent: 'position_lookup'
  fen: string
  totalPositions: number
  totalGames: number
}

export type CounterfactualSummary = SummaryBase & {
  intent: 'counterfactual'
  suggestedAlternative: string | null
}

export type QuerySummary =
  | AggregateSummary
  | ComparisonSummary
  | TrendSummary
  | NegativeEvidenceSummary
  | PositionSummary
  | CounterfactualSummary

export type SearchResponse = {
  intent: QueryIntent
  parsedQuery: ParsedQuery
  summary: QuerySummary | null
  results: RetrievalSource[]
}

export type AskStreamEvent =
  | {
      type: 'summary'
      summary: QuerySummary
    }
  | {
      type: 'sources'
      sources: RetrievalSource[]
    }
  | {
      type: 'answer-delta'
      delta: string
    }
  | {
      type: 'done'
    }
  | {
      type: 'error'
      error: string
    }
