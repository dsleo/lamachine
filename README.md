# La Machine

AGI vs OuLiPo — a small Next.js app where a human and a model try to write under deterministic constraints.

## Local dev

1) Install dependencies:

```bash
npm install
```

2) Add your OpenAI key locally (never commit it):

Create a file `.env.local`:

```bash
OPENAI_API_KEY=YOUR_KEY_HERE
```

### Database (recommended: Vercel Postgres)

This app uses **Postgres + Drizzle**.

You do **not** need Postgres installed locally. The easiest setup is to use **Vercel Postgres** and reuse the same database connection string in both Vercel and local dev.

If you don’t set `DATABASE_URL`, the app still runs, but submissions will fail (you’ll see `Missing DATABASE_URL`).

#### Setup (Option A: Vercel Postgres)

1) In Vercel:
   - Go to **Storage → Create Database → Postgres**
   - Copy the **connection string** (`DATABASE_URL`)

2) Put it in **Vercel env vars** (Project Settings → Environment Variables):
   - `DATABASE_URL` (Production + Preview + Development)

3) Put it in local `.env.local`:

```bash
DATABASE_URL=YOUR_VERCEL_POSTGRES_URL
```

4) Run migrations locally (this applies them to the remote DB):

```bash
npm run db:migrate
```

3) Run the dev server (port **9002**):

```bash
npm run dev
```

Open: http://localhost:9002

## Routes

- `/` — landing
- `/daily` — daily challenge hub (today’s constraint)
- `/daily/coach` — daily coach (LLM) run + Validate & Submit
- `/daily/versus` — daily human vs machine + Validate & Submit
- `/campaign` — campaign menu
- `/arena` — campaign arena
- `/versus` — campaign versus
- `/leaderboard` — all-time + weekly + monthly
- `/editor` — the original constrained editor

## Deploy (Vercel)

1) In Vercel: **Project Settings → Environment Variables**

Add:

- `OPENAI_API_KEY` (Production + Preview + Development)
- `DATABASE_URL` (if you want leaderboard persistence)

2) Deploy.

The app uses a Next.js Route Handler proxy at:

- `POST /api/openai/stream`

It streams back **text/plain** (no API key is ever exposed to the client).
