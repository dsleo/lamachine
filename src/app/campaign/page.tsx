export default function CampaignStartPage() {
    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-3xl space-y-6 p-6 sm:p-10">
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold">Campaign</h1>
                    <p className="text-sm text-muted-foreground">
                        10 niveaux fixes. Score type arcade.
                    </p>
                </header>

                <div className="space-y-3">
                    <a href="/arena" className="block rounded-lg border bg-card p-5 hover:bg-accent/30">
                        <div className="text-lg font-semibold">Coach</div>
                        <div className="text-sm text-muted-foreground">Aidez la Machine à aller le plus loin possible, sous contrainte.</div>
                    </a>
                    <a href="/versus" className="block rounded-lg border bg-card p-5 hover:bg-accent/30">
                        <div className="text-lg font-semibold">Battez la Machine</div>
                        <div className="text-sm text-muted-foreground">Battez la Machine sur chaque niveau.</div>
                    </a>
                </div>
            </div>
        </main>
    );
}
