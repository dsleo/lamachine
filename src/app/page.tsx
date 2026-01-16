export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-3xl space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">La Machine</h1>
        <p className="text-muted-foreground">AGI vs OuLiPo</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="/daily"
            className="rounded-lg border bg-card p-6 text-left hover:bg-accent/30"
          >
            <div className="text-lg font-semibold">Daily</div>
            <div className="mt-1 text-sm text-muted-foreground">One constraint per day. Top 10 today & yesterday.</div>
          </a>

          <a
            href="/free"
            className="rounded-lg border bg-card p-6 text-left hover:bg-accent/30"
          >
            <div className="text-lg font-semibold">Libre</div>
            <div className="mt-1 text-sm text-muted-foreground">Pick constraints and play freely.</div>
          </a>
        </div>

        <div className="text-sm">
          <a href="/editor" className="underline underline-offset-4 text-muted-foreground hover:text-foreground">
            Just the editor
          </a>
        </div>
      </div>
    </main>
  );
}
