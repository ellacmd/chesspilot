'use client';

import { ChangeEvent, FormEvent, useState } from 'react';

type CreatedGame = {
    id: string;
    white: string;
    black: string;
    result: string | null;
    opening: string | null;
};

export default function IngestPage() {
    const [pgn, setPgn] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [createdGame, setCreatedGame] = useState<CreatedGame | null>(null);
    const [positionsCount, setPositionsCount] = useState<number | null>(null);
    const [chunksCount, setChunksCount] = useState<number | null>(null);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const text = await file.text();
        setPgn(text);
        setMessage(`Loaded ${file.name}`);
        setError('');
        setCreatedGame(null);
        setPositionsCount(null);
        setChunksCount(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setChunksCount(null);
        setPositionsCount(null);
        setMessage('');
        setError('');
        setCreatedGame(null);

        if (!pgn.trim()) {
            setError('Please paste a PGN or upload a .pgn file.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/ingest/pgn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pgn }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            setMessage(data.message || 'PGN submitted successfully.');
            setCreatedGame(data.game);
            setPositionsCount(data.positionsCount ?? null);
            setChunksCount(data.chunksCount ?? null);
            setError('');
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to submit PGN.';
            setError(message);
            setMessage('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className='min-h-screen bg-zinc-950 text-zinc-100'>
            <div className='mx-auto max-w-3xl px-6 py-16'>
                <div className='mb-10'>
                    <p className='mb-3 text-sm uppercase tracking-[0.2em] text-zinc-400'>
                        Day 4
                    </p>
                    <h1 className='text-3xl font-semibold tracking-tight sm:text-5xl'>
                        Ingest PGN
                    </h1>
                    <p className='mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base'>
                        Paste a PGN or upload a .pgn file to add a chess game
                        into the system.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className='rounded-2xl border border-zinc-800 bg-zinc-900 p-6'>
                    <div className='mb-6'>
                        <label
                            htmlFor='pgn'
                            className='mb-2 block text-sm font-medium text-zinc-200'>
                            PGN text
                        </label>
                        <textarea
                            id='pgn'
                            value={pgn}
                            onChange={(event) => setPgn(event.target.value)}
                            placeholder='Paste PGN here, e.g. [Event "Casual Game"] ...'
                            className='min-h-[320px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-600'
                        />
                    </div>

                    <div className='mb-6'>
                        <label
                            htmlFor='file'
                            className='mb-2 block text-sm font-medium text-zinc-200'>
                            Upload .pgn file
                        </label>
                        <input
                            id='file'
                            type='file'
                            accept='.pgn,text/plain'
                            onChange={handleFileChange}
                            className='block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-200'
                        />
                    </div>

                    <div className='flex items-center gap-3'>
                        <button
                            type='submit'
                            disabled={isSubmitting}
                            className='rounded-xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60'>
                            {isSubmitting ? 'Submitting...' : 'Submit PGN'}
                        </button>
                    </div>

                    {message ? (
                        <p className='mt-4 text-sm text-emerald-400'>
                            {message}
                        </p>
                    ) : null}

                    {error ? (
                        <p className='mt-4 text-sm text-red-400'>{error}</p>
                    ) : null}

                    {createdGame ? (
                        <div className='mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4'>
                            <p className='text-sm font-medium text-zinc-200'>
                                Saved game successfully
                            </p>
                            <p className='mt-2 text-sm text-zinc-400'>
                                {createdGame.white} vs {createdGame.black}
                            </p>
                            <p className='text-sm text-zinc-500'>
                                Result: {createdGame.result ?? 'Unknown'}
                            </p>
                            <p className='text-sm text-zinc-500'>
                                Opening: {createdGame.opening ?? 'Unknown'}
                            </p>
                            <p className='text-sm text-zinc-500'>
                                Game ID: {createdGame.id}
                            </p>
                            {positionsCount !== null ? (
                                <p className='text-sm text-zinc-500'>
                                    Positions stored: {positionsCount}
                                </p>
                            ) : null}
                            {chunksCount !== null ? (
                                <p className='text-sm text-zinc-500'>
                                    Chunks stored: {chunksCount}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </form>
            </div>
        </main>
    );
}
