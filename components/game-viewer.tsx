'use client';

import { useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';

type PositionRecord = {
    id: string;
    ply: number;
    fen: string;
    san: string;
    uci: string;
    sideToMove: string;
};

type ChunkRecord = {
    id: string;
    type: string;
    startPly: number;
    endPly: number;
    summary: string | null;
    tags: string[];
};

type GameViewerProps = {
    game: {
        id: string;
        white: string;
        black: string;
        opening: string | null;
        result: string | null;
        movesJson: string[];
        positions: PositionRecord[];
        chunks: ChunkRecord[];
    };
};

export default function GameViewer({ game }: GameViewerProps) {
    const [currentPly, setCurrentPly] = useState(0);

    const currentPosition = useMemo(() => {
        return (
            game.positions.find((position) => position.ply === currentPly) ??
            game.positions[0]
        );
    }, [currentPly, game.positions]);

    const maxPly =
        game.positions.length > 0
            ? game.positions[game.positions.length - 1].ply
            : 0;

    const activeChunk = useMemo(() => {
        return (
            game.chunks.find(
                (chunk) =>
                    currentPly >= chunk.startPly && currentPly <= chunk.endPly,
            ) ?? null
        );
    }, [currentPly, game.chunks]);

    console.log(game, 'done');

    const goToPrevious = () => {
        setCurrentPly((prev) => Math.max(prev - 1, 0));
    };

    const goToNext = () => {
        setCurrentPly((prev) => Math.min(prev + 1, maxPly));
    };

    const goToStart = () => {
        setCurrentPly(0);
    };

    const goToEnd = () => {
        setCurrentPly(maxPly);
    };

    return (
        <div className='grid gap-8 lg:grid-cols-[1.2fr_0.8fr]'>
            <div className='rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6'>
                <div className='mb-4 flex items-center justify-between'>
                    <div>
                        <p className='text-sm text-zinc-400'>Current ply</p>
                        <p className='text-lg font-medium text-zinc-100'>
                            {currentPly}
                        </p>
                    </div>

                    <div className='text-right'>
                        <p className='text-sm text-zinc-400'>Side to move</p>
                        <p className='text-lg font-medium text-zinc-100'>
                            {currentPosition?.sideToMove === 'w'
                                ? 'White'
                                : 'Black'}
                        </p>
                    </div>
                </div>

                <div className='overflow-hidden rounded-2xl'>
                    <Chessboard
                        options={{
                            position: currentPosition?.fen ?? 'start',
                        }}
                    />
                </div>

                <div className='mt-5 flex flex-wrap gap-3'>
                    <button
                        onClick={goToStart}
                        className='rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 transition hover:border-zinc-700'>
                        Start
                    </button>

                    <button
                        onClick={goToPrevious}
                        className='rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 transition hover:border-zinc-700'>
                        Previous
                    </button>

                    <button
                        onClick={goToNext}
                        className='rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200'>
                        Next
                    </button>

                    <button
                        onClick={goToEnd}
                        className='rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 transition hover:border-zinc-700'>
                        End
                    </button>
                </div>

                {activeChunk ? (
                    <div className='mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4'>
                        <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>
                            Active chunk
                        </p>
                        <p className='mt-2 text-sm font-medium capitalize text-zinc-100'>
                            {activeChunk.type}
                        </p>
                        <p className='mt-1 text-sm text-zinc-400'>
                            Ply {activeChunk.startPly} to {activeChunk.endPly}
                        </p>
                        {activeChunk.summary ? (
                            <p className='mt-3 text-sm leading-6 text-zinc-300'>
                                {activeChunk.summary}
                            </p>
                        ) : null}
                        {activeChunk.tags.length > 0 ? (
                            <div className='mt-3 flex flex-wrap gap-2'>
                                {activeChunk.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className='rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-400'>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className='space-y-6'>
                <div className='rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6'>
                    <div className='mb-4'>
                        <h2 className='text-lg font-medium text-zinc-100'>
                            Chunks
                        </h2>
                        <p className='mt-1 text-sm text-zinc-400'>
                            Structured segments used later for retrieval.
                        </p>
                    </div>

                    <div className='space-y-3'>
                        {game.chunks.map((chunk) => {
                            const isActive =
                                currentPly >= chunk.startPly &&
                                currentPly <= chunk.endPly;

                            return (
                                <button
                                    key={chunk.id}
                                    onClick={() =>
                                        setCurrentPly(chunk.startPly)
                                    }
                                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                        isActive
                                            ? 'border-zinc-100 bg-zinc-100 text-zinc-900'
                                            : 'border-zinc-800 bg-zinc-950 text-zinc-100 hover:border-zinc-700'
                                    }`}>
                                    <p className='text-sm font-medium capitalize'>
                                        {chunk.type}
                                    </p>
                                    <p className='mt-1 text-xs opacity-70'>
                                        Ply {chunk.startPly} to {chunk.endPly}
                                    </p>
                                    {chunk.summary ? (
                                        <p className='mt-2 text-sm leading-6 opacity-90'>
                                            {chunk.summary}
                                        </p>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className='rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6'>
                    <div className='mb-4'>
                        <h2 className='text-lg font-medium text-zinc-100'>
                            Moves
                        </h2>
                        <p className='mt-1 text-sm text-zinc-400'>
                            Click through the game move by move.
                        </p>
                    </div>

                    <div className='max-h-[420px] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3'>
                        <div className='grid grid-cols-1 gap-2'>
                            {game.positions
                                .filter((position) => position.ply !== 0)
                                .map((position) => {
                                    const isActive =
                                        position.ply === currentPly;

                                    return (
                                        <button
                                            key={position.id}
                                            onClick={() =>
                                                setCurrentPly(position.ply)
                                            }
                                            className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                                                isActive
                                                    ? 'bg-zinc-100 text-zinc-900'
                                                    : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                                            }`}>
                                            <span className='mr-2 text-xs opacity-70'>
                                                Ply {position.ply}
                                            </span>
                                            <span>{position.san}</span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
