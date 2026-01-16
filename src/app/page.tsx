export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-3xl space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">La Machine</h1>
        <p className="text-muted-foreground">AGI vs OuLiPo</p>

        <div className="grid grid-cols-1 gap-4">
          <a
            href="/daily"
            className="block rounded-2xl border bg-card p-8 text-left transition-all hover:-translate-y-[1px] hover:bg-accent/30 hover:border-primary/50"
          >
            <div className="text-2xl font-semibold">Jouez</div>
          </a>
        </div>

        <div className="text-sm">
          <a href="/editor" className="underline underline-offset-4 text-muted-foreground hover:text-foreground">
            Éditeur
          </a>
        </div>
      </div>
    </main>
  );
}
