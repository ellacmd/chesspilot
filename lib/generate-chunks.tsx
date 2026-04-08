type GeneratedChunk = {
    type: string;
    startPly: number;
    endPly: number;
    summary: string | null;
    tags: string[];
};

export function generateChunksFromPositions(maxPly: number): GeneratedChunk[] {
    if (maxPly <= 0) {
        return [];
    }

    const chunks: GeneratedChunk[] = [];

    const openingEnd = Math.min(20, maxPly);

    chunks.push({
        type: 'opening',
        startPly: 1,
        endPly: openingEnd,
        summary: null,
        tags: [],
    });

    if (maxPly <= 20) {
        return chunks;
    }

    if (maxPly < 40) {
        chunks.push({
            type: 'middlegame',
            startPly: 21,
            endPly: maxPly,
            summary: null,
            tags: [],
        });

        return chunks;
    }

    const endgameStart = Math.max(21, Math.floor(maxPly * 0.7));
    const middlegameEnd = endgameStart - 1;

    if (middlegameEnd >= 21) {
        chunks.push({
            type: 'middlegame',
            startPly: 21,
            endPly: middlegameEnd,
            summary: null,
            tags: [],
        });
    }

    chunks.push({
        type: 'endgame',
        startPly: endgameStart,
        endPly: maxPly,
        summary: null,
        tags: [],
    });

    return chunks;
}
