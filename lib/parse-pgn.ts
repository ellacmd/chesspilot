import { Chess } from 'chess.js';

type ParsedPgn = {
    white: string;
    black: string;
    whiteElo: number | null;
    blackElo: number | null;
    event: string | null;
    site: string | null;
    playedAt: Date | null;
    result: string | null;
    opening: string | null;
    eco: string | null;
    pgn: string;
    movesJson: string[];
};

function parseHeaderValue(pgn: string, key: string) {
    const regex = new RegExp(`\\[${key}\\s+"([^"]*)"\\]`);
    const match = pgn.match(regex);
    return match?.[1] ?? null;
}

function parseElo(value: string | null) {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseDateValue(value: string | null) {
    if (!value) return null;

    if (value.includes('?')) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function parsePgn(pgn: string): ParsedPgn {
    const chess = new Chess();

    try {
        chess.loadPgn(pgn);
    } catch (cause) {
        throw new Error('Invalid PGN. Could not load game.', { cause });
    }

    const history = chess.history();

    return {
        white: parseHeaderValue(pgn, 'White') ?? 'Unknown White',
        black: parseHeaderValue(pgn, 'Black') ?? 'Unknown Black',
        whiteElo: parseElo(parseHeaderValue(pgn, 'WhiteElo')),
        blackElo: parseElo(parseHeaderValue(pgn, 'BlackElo')),
        event: parseHeaderValue(pgn, 'Event'),
        site: parseHeaderValue(pgn, 'Site'),
        playedAt: parseDateValue(parseHeaderValue(pgn, 'Date')),
        result: parseHeaderValue(pgn, 'Result'),
        opening: parseHeaderValue(pgn, 'Opening'),
        eco: parseHeaderValue(pgn, 'ECO'),
        pgn,
        movesJson: history,
    };
}
