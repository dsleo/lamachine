export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-3xl space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">La Machine</h1>
        <p className="text-muted-foreground">AGI vs OuLiPo</p>

        <div className="flex items-center justify-center gap-3">
          <a
            href="/daily/versus"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Jouer
          </a>

          <a
            href="/leaderboard"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Leaderboard
          </a>
        </div>
      </div>
    </main>
  );
}
