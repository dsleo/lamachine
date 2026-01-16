export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-10 p-6 sm:p-10">
        <header className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">La Machine</h1>
          <p className="text-muted-foreground">AGI vs OuLiPo</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Jouez !</h2>

          <a
            href="/daily"
            className="block rounded-2xl border bg-card p-8 transition-all hover:-translate-y-[1px] hover:bg-accent/30 hover:border-primary/50"
          >
            <div className="text-2xl font-semibold">Challenge</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Une contrainte. Deux modes.
            </div>
          </a>
        </section>

        <footer className="text-sm">
          <a href="/editor" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Éditeur
          </a>
        </footer>
      </div>
    </main>
  );
}
