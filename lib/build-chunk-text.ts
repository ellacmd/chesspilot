type BuildChunkTextArgs = {
    type: string
    summary: string
    tags: string[]
    opening: string | null
  }
  
  export function buildChunkText({
    type,
    summary,
    tags,
    opening,
  }: BuildChunkTextArgs) {
    return [
      `Type: ${type}`,
      `Opening: ${opening ?? 'unknown'}`,
      `Summary: ${summary}`,
      `Tags: ${tags.join(', ')}`,
    ].join('\n')
  }