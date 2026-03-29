import { Chess } from 'chess.js'

type ExtractedPosition = {
  ply: number
  fen: string
  san: string
  uci: string
  sideToMove: string
}

export function extractPositionsFromPgn(pgn: string): ExtractedPosition[] {
  const chess = new Chess()
  chess.loadPgn(pgn)

  const verboseMoves = chess.history({ verbose: true })

  const replay = new Chess()

  const positions: ExtractedPosition[] = [
    {
      ply: 0,
      fen: replay.fen(),
      san: 'START',
      uci: 'START',
      sideToMove: replay.turn(),
    },
  ]

  verboseMoves.forEach((move, index) => {
    replay.move(move)

    positions.push({
      ply: index + 1,
      fen: replay.fen(),
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ''}`,
      sideToMove: replay.turn(),
    })
  })

  return positions
}