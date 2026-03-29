type ChunkInput = {
    type: string
    startPly: number
    endPly: number
  }
  
  type SummarizeChunksArgs = {
    chunks: ChunkInput[]
    white: string
    black: string
    opening: string | null
    eco: string | null
    result: string | null
  }
  
  type SummarizedChunk = {
    type: string
    startPly: number
    endPly: number
    summary: string
    tags: string[]
  }
  
  function normalizeTag(value: string) {
    return value.trim().toLowerCase()
  }
  
  function getResultTag(result: string | null) {
    if (result === '1-0') return 'white win'
    if (result === '0-1') return 'black win'
    if (result === '1/2-1/2') return 'draw'
    return 'unknown result'
  }
  
  function buildSummary({
    chunk,
    white,
    black,
    opening,
    eco,
    result,
  }: {
    chunk: ChunkInput
    white: string
    black: string
    opening: string | null
    eco: string | null
    result: string | null
  }) {
    const openingText = opening ?? 'unknown opening'
    const ecoText = eco ? ` (${eco})` : ''
    const resultText =
      result === '1-0'
        ? `${white} wins`
        : result === '0-1'
        ? `${black} wins`
        : result === '1/2-1/2'
        ? 'game drawn'
        : 'result unknown'
  
    if (chunk.type === 'opening') {
      return `${openingText}${ecoText} opening phase from ply ${chunk.startPly} to ${chunk.endPly} in ${white} vs ${black}. ${resultText}.`
    }
  
    if (chunk.type === 'middlegame') {
      return `Middlegame phase from ply ${chunk.startPly} to ${chunk.endPly} in ${white} vs ${black}, arising from the ${openingText}${ecoText}. ${resultText}.`
    }
  
    if (chunk.type === 'endgame') {
      return `Endgame phase from ply ${chunk.startPly} to ${chunk.endPly} in ${white} vs ${black}. Originates from the ${openingText}${ecoText}. ${resultText}.`
    }
  
    return `Game segment from ply ${chunk.startPly} to ${chunk.endPly} in ${white} vs ${black}. ${resultText}.`
  }
  
  function buildTags({
    chunk,
    opening,
    eco,
    result,
  }: {
    chunk: ChunkInput
    opening: string | null
    eco: string | null
    result: string | null
  }) {
    const tags = [
      chunk.type,
      getResultTag(result),
    ]
  
    if (opening) {
      tags.push(opening)
    }
  
    if (eco) {
      tags.push(eco)
    }
  
    return Array.from(new Set(tags.map(normalizeTag)))
  }
  
  export function summarizeChunks({
    chunks,
    white,
    black,
    opening,
    eco,
    result,
  }: SummarizeChunksArgs): SummarizedChunk[] {
    return chunks.map((chunk) => ({
      ...chunk,
      summary: buildSummary({
        chunk,
        white,
        black,
        opening,
        eco,
        result,
      }),
      tags: buildTags({
        chunk,
        opening,
        eco,
        result,
      }),
    }))
  }