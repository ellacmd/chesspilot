import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { embedText } from '@/lib/embed';
import { Prisma } from '@/app/generated/prisma/client';

function cosineSimilarity(a: number[], b: number[]) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);

    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    return dot / (magA * magB);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const query = body?.query;

    if (!query) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const queryEmbedding = await embedText(query);

    const chunks = await prisma.chunk.findMany({
        where: { embedding: { not: Prisma.DbNull } },
        include: { game: true },
    });

    const scored = chunks.map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
    }));

    const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);

    const context = top
        .map(
            (item, i) => `
            [Chunk ${i + 1}]
            Game: ${item.chunk.game.white} vs ${item.chunk.game.black}
            Type: ${item.chunk.type}
            Ply Range: ${item.chunk.startPly} to ${item.chunk.endPly}
            Content:
            ${item.chunk.content ?? item.chunk.summary ?? ''}
        `,
        )
        .join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a chess coach.Use the provided context to answer.If the question asks for moves, extract and reference moves from the context.Be specific and practical. If unsure, say so.',
                },
                {
                    role: 'user',
                    content: `Question: ${query}\n\nContext:\n${context}`,
                },
            ],
        }),
    });

    const data = await response.json();

    return NextResponse.json({
        answer: data.choices?.[0]?.message?.content ?? '',
        chunks: top.map((t) => ({
            summary: t.chunk.summary,
            score: t.score,
        })),
    });
}
