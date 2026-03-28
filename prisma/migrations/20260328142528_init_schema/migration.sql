-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "source" TEXT,
    "white" TEXT NOT NULL,
    "black" TEXT NOT NULL,
    "whiteElo" INTEGER,
    "blackElo" INTEGER,
    "event" TEXT,
    "site" TEXT,
    "playedAt" TIMESTAMP(3),
    "result" TEXT,
    "opening" TEXT,
    "eco" TEXT,
    "pgn" TEXT NOT NULL,
    "movesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "fen" TEXT NOT NULL,
    "san" TEXT NOT NULL,
    "uci" TEXT NOT NULL,
    "sideToMove" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startPly" INTEGER NOT NULL,
    "endPly" INTEGER NOT NULL,
    "summary" TEXT,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Position_gameId_idx" ON "Position"("gameId");

-- CreateIndex
CREATE INDEX "Position_fen_idx" ON "Position"("fen");

-- CreateIndex
CREATE INDEX "Position_ply_idx" ON "Position"("ply");

-- CreateIndex
CREATE INDEX "Chunk_gameId_idx" ON "Chunk"("gameId");

-- CreateIndex
CREATE INDEX "Chunk_type_idx" ON "Chunk"("type");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
