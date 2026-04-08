import type { ParsedQuery } from '@/types/retrieval'

const REPERTOIRE_PATTERNS = [
  /what does\s+(.+?)\s+play as\s+(black|white)(?:\s+against\s+(.+?))?[\s?]*$/i,
  /what does\s+(.+?)\s+usually play as\s+(black|white)(?:\s+against\s+(.+?))?[\s?]*$/i,
  /what openings does\s+(.+?)\s+play as\s+(black|white)(?:\s+against\s+(.+?))?[\s?]*$/i,
]

const COMPARISON_PATTERNS = [
  /compare\s+(.+?)\s+and\s+(.+?)\s+as\s+(black|white)(?:\s+against\s+(.+?))?[\s?]*$/i,
  /how does\s+(.+?)\s+differ from\s+(.+?)\s+as\s+(black|white)(?:\s+against\s+(.+?))?[\s?]*$/i,
]

const TREND_PATTERNS = [
  /what is\s+(.+?)\s+playing lately as\s+(black|white)(?:\s+against\s+(.+?))?[\s?]*$/i,
  /has\s+(.+?)\s+changed.+as\s+(black|white)(?:\s+against\s+(.+?))?[\s?]*$/i,
]

const NEGATIVE_PATTERNS = [
  /does\s+(.+?)\s+(?:ever\s+)?play\s+(.+?)\s+as\s+(black|white)[\s?]*$/i,
]

const COUNTERFACTUAL_PATTERNS = [
  /would\s+(.+?)\s+.+[\s?]*$/i,
  /is\s+(.+?)\s+objectively.+[\s?]*$/i,
]

const FEN_PATTERN =
  /\b(?:[prnbqkPRNBQK1-8]+\/){7}[prnbqkPRNBQK1-8]+\s+[wb]\s+(?:-|[KQkq]{1,4})\s+(?:-|[a-h][36])\s+\d+\s+\d+\b/

function cleanCapturedValue(value: string | undefined) {
  if (!value) {
    return null
  }

  const cleaned = value.trim().replace(/\?+$/, '')
  return cleaned || null
}

function buildSourceLookup(raw: string, routeReason: string): ParsedQuery {
  return {
    raw,
    intent: 'source_lookup',
    playerTerm: null,
    secondPlayerTerm: null,
    color: null,
    openingFilter: null,
    fen: null,
    routeReason,
  }
}

export function parseQuery(raw: string): ParsedQuery {
  const normalized = raw.trim()

  const fenMatch = normalized.match(FEN_PATTERN)

  if (fenMatch) {
    return {
      raw: normalized,
      intent: 'position_lookup',
      playerTerm: null,
      secondPlayerTerm: null,
      color: null,
      openingFilter: null,
      fen: fenMatch[0],
      routeReason: 'Detected a full FEN string and routed to exact position lookup.',
    }
  }

  for (const pattern of COMPARISON_PATTERNS) {
    const match = normalized.match(pattern)

    if (!match) {
      continue
    }

    const left = cleanCapturedValue(match[1])
    const right = cleanCapturedValue(match[2])
    const color = cleanCapturedValue(match[3]) as 'white' | 'black' | null
    const openingFilter = cleanCapturedValue(match[4])

    if (left && right && color) {
      return {
        raw: normalized,
        intent: 'comparative',
        playerTerm: left,
        secondPlayerTerm: right,
        color,
        openingFilter,
        fen: null,
        routeReason: openingFilter
          ? `Detected a comparison query for ${left} and ${right} as ${color} with an opening filter.`
          : `Detected a comparison query for ${left} and ${right} as ${color}.`,
      }
    }
  }

  for (const pattern of TREND_PATTERNS) {
    const match = normalized.match(pattern)

    if (!match) {
      continue
    }

    const playerTerm = cleanCapturedValue(match[1])
    const color = cleanCapturedValue(match[2]) as 'white' | 'black' | null
    const openingFilter = cleanCapturedValue(match[3])

    if (playerTerm && color) {
      return {
        raw: normalized,
        intent: 'trend',
        playerTerm,
        secondPlayerTerm: null,
        color,
        openingFilter,
        fen: null,
        routeReason: openingFilter
          ? `Detected a trend query for ${playerTerm} as ${color} with an opening filter.`
          : `Detected a trend query for ${playerTerm} as ${color}.`,
      }
    }
  }

  for (const pattern of NEGATIVE_PATTERNS) {
    const match = normalized.match(pattern)

    if (!match) {
      continue
    }

    const playerTerm = cleanCapturedValue(match[1])
    const openingFilter = cleanCapturedValue(match[2])
    const color = cleanCapturedValue(match[3]) as 'white' | 'black' | null

    if (playerTerm && openingFilter && color) {
      return {
        raw: normalized,
        intent: 'negative_evidence',
        playerTerm,
        secondPlayerTerm: null,
        color,
        openingFilter,
        fen: null,
        routeReason: `Detected a negative-evidence query for ${playerTerm} as ${color} about ${openingFilter}.`,
      }
    }
  }

  for (const pattern of REPERTOIRE_PATTERNS) {
    const match = normalized.match(pattern)

    if (!match) {
      continue
    }

    const playerTerm = cleanCapturedValue(match[1])
    const color = cleanCapturedValue(match[2]) as 'white' | 'black' | null
    const openingFilter = cleanCapturedValue(match[3])

    if (playerTerm && color) {
      return {
        raw: normalized,
        intent: 'repertoire_aggregate',
        playerTerm,
        secondPlayerTerm: null,
        color,
        openingFilter,
        fen: null,
        routeReason: openingFilter
          ? `Detected a repertoire question for ${playerTerm} as ${color} with an opening filter.`
          : `Detected a repertoire question for ${playerTerm} as ${color}.`,
      }
    }
  }

  for (const pattern of COUNTERFACTUAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        raw: normalized,
        intent: 'counterfactual',
        playerTerm: null,
        secondPlayerTerm: null,
        color: null,
        openingFilter: null,
        fen: null,
        routeReason: 'Detected a counterfactual or opinion-style query that the corpus cannot directly prove.',
      }
    }
  }

  return buildSourceLookup(
    normalized,
    'Defaulted to source lookup because the query did not match a structured route with current schema support.'
  )
}
