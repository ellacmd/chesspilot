import { NextRequest, NextResponse } from 'next/server'
import { getAnswerDelta, parseChatCompletionChunk, toErrorStatus } from '@/lib/ask-stream'
import { getStructuredQueryResult } from '@/lib/game-analytics'
import { parseQuery } from '@/lib/query-routing'
import { buildAskContext, encodeStreamEvent, getTopSources, normalizeQuery } from '@/lib/retrieval'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = normalizeQuery(body?.query)

    if (!query) {
      return NextResponse.json({ error: 'Query required.' }, { status: 400 })
    }

    const parsedQuery = parseQuery(query)
    const structuredResult = await getStructuredQueryResult(query, parsedQuery)
    const summary = structuredResult?.summary ?? null
    const sources = structuredResult?.results ?? (await getTopSources(query))
    const context = buildAskContext({
      parsedQuery,
      summary,
      sources,
    })

    const upstreamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              'You are a chess research assistant. Answer only from the provided sources. Cite claims inline with [Source N]. Use three short sections when supported by the evidence: Short answer, Evidence, Practical takeaway. If evidence is weak or incomplete, say so plainly.',
          },
          {
            role: 'user',
            content: `Question: ${query}\n\nSources:\n${context}`,
          },
        ],
      }),
    })

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorPayload = await upstreamResponse.json().catch(() => null)
      const message =
        errorPayload?.error?.message ?? 'Failed to generate an answer.'

      return NextResponse.json({ error: message }, { status: 500 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        if (summary) {
          controller.enqueue(encodeStreamEvent({ type: 'summary', summary }))
        }

        controller.enqueue(encodeStreamEvent({ type: 'sources', sources }))

        const reader = upstreamResponse.body?.getReader()

        if (!reader) {
          controller.enqueue(
            encodeStreamEvent({
              type: 'error',
              error: 'The model response stream was unavailable.',
            })
          )
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const rawLine of lines) {
              const line = rawLine.trim()

              if (!line) {
                continue
              }

              const chunk = parseChatCompletionChunk(line)
              const delta = getAnswerDelta(chunk)

              if (delta) {
                controller.enqueue(
                  encodeStreamEvent({ type: 'answer-delta', delta })
                )
              }
            }
          }

          const tail = decoder.decode()

          if (tail) {
            buffer += tail
          }

          if (buffer.trim()) {
            const chunk = parseChatCompletionChunk(buffer.trim())
            const delta = getAnswerDelta(chunk)

            if (delta) {
              controller.enqueue(
                encodeStreamEvent({ type: 'answer-delta', delta })
              )
            }
          }

          controller.enqueue(encodeStreamEvent({ type: 'done' }))
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Streaming failed.'

          controller.enqueue(encodeStreamEvent({ type: 'error', error: message }))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate an answer.'
    const status = toErrorStatus(message)

    return NextResponse.json({ error: message }, { status })
  }
}
