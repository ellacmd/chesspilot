export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
        <div className="mb-12">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-zinc-400">
            Day 1
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Pawnalyze
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            An AI chess research agent for finding model games, exploring positions,
            and learning from structured chess data.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-medium">PGN Ingestion</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Upload and parse chess games into structured records.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-medium">Semantic Search</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Search chess games with natural language and retrieve relevant chunks.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-medium">Position Research</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Paste a FEN and discover similar positions, plans, and model games.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}