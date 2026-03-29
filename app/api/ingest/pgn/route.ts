import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parsePgn } from '@/lib/parse-pgn';
import { extractPositionsFromPgn } from '@/lib/extract-positions';
import { generateChunksFromPositions } from '@/lib/generate-chunks';
import { summarizeChunks } from '@/lib/summarize-chunks';
import { embedText } from '@/lib/embed'
import { buildChunkText } from '@/lib/build-chunk-text'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const pgn = body?.pgn;

        if (!pgn || typeof pgn !== 'string') {
            return NextResponse.json(
                { error: 'PGN is required.' },
                { status: 400 },
            );
        }

        const parsed = parsePgn(pgn);
        const extractedPositions = extractPositionsFromPgn(pgn);

        const game = await prisma.game.create({
            data: {
                source: 'manual',
                white: parsed.white,
                black: parsed.black,
                whiteElo: parsed.whiteElo,
                blackElo: parsed.blackElo,
                event: parsed.event,
                site: parsed.site,
                playedAt: parsed.playedAt,
                result: parsed.result,
                opening: parsed.opening,
                eco: parsed.eco,
                pgn: parsed.pgn,
                movesJson: parsed.movesJson,
            },
        });

        await prisma.position.createMany({
            data: extractedPositions.map((position) => ({
                gameId: game.id,
                ply: position.ply,
                fen: position.fen,
                san: position.san,
                uci: position.uci,
                sideToMove: position.sideToMove,
            })),
        });

        const maxPly =
            extractedPositions[extractedPositions.length - 1]?.ply ?? 0;
        const generatedChunks = generateChunksFromPositions(maxPly);

    
        const summarizedChunks = summarizeChunks({
            chunks: generatedChunks,
            white: parsed.white,
            black: parsed.black,
            opening: parsed.opening,
            eco: parsed.eco,
            result: parsed.result,
        });
        
        const chunksWithEmbeddings = await Promise.all(
            summarizedChunks.map(async (chunk) => {
              const text = buildChunkText({
                type: chunk.type,
                summary: chunk.summary,
                tags: chunk.tags,
                opening: parsed.opening,
              })
          
              const embedding = await embedText(text)
          
              return {
                gameId: game.id,
                type: chunk.type,
                startPly: chunk.startPly,
                endPly: chunk.endPly,
                summary: chunk.summary,
                tags: chunk.tags,
                embedding,
              }
            })
          )
          
          await prisma.chunk.createMany({
            data: chunksWithEmbeddings,
          })



        return NextResponse.json({
            message: 'PGN ingested successfully.',
            game: {
                id: game.id,
                white: game.white,
                black: game.black,
                result: game.result,
                opening: game.opening,
            },
            positionsCount: extractedPositions.length,
            chunksCount: summarizedChunks.length,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Failed to ingest PGN.';

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
