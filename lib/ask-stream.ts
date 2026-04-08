import type { AskStreamEvent } from '@/types/retrieval'

type ChatCompletionChunk = {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

const DATA_PREFIX = 'data: '
const DONE_EVENT = '[DONE]'

export function toErrorStatus(message: string) {
  return message.startsWith('Query must be ') ? 400 : 500
}

export function parseChatCompletionChunk(line: string) {
  if (!line.startsWith(DATA_PREFIX)) {
    return null
  }

  const payload = line.slice(DATA_PREFIX.length).trim()

  if (!payload || payload === DONE_EVENT) {
    return payload
  }

  return JSON.parse(payload) as ChatCompletionChunk
}

export function getAnswerDelta(chunk: ChatCompletionChunk | string | null) {
  if (!chunk || typeof chunk === 'string') {
    return null
  }

  return chunk.choices?.[0]?.delta?.content ?? null
}

export function parseAskStreamEvents(
  buffer: string,
  onEvent: (event: AskStreamEvent) => void
) {
  const lines = buffer.split('\n')
  const remainder = lines.pop() ?? ''

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    onEvent(JSON.parse(line) as AskStreamEvent)
  }

  return remainder
}
