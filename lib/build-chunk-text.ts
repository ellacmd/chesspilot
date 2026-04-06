type BuildChunkTextArgs = {
    type: string
    summary: string
    tags: string[]
    opening: string | null
    moves: string[]

  }
  
  export function buildChunkText({
    type,
    summary,
    tags,
    opening,
    moves,
  }: BuildChunkTextArgs) {
    return [
      `Type: ${type}`,
      `Opening: ${opening ?? 'unknown'}`,
      `Summary: ${summary}`,
      `Moves: ${moves.join(' ')}`,
      `Tags: ${tags.join(', ')}`,
    ].join('\n')
  }