# Groundwork (web app)

Investing education app for UK beginners: a structured course, an AI tutor, and a portfolio
tracker that teaches with your own holdings. Product plan, Trading 212 findings and risks:
[`../docs/PLAN.md`](../docs/PLAN.md).

Stack: Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind 4, shadcn/ui,
Supabase (Postgres, Auth, RLS), Anthropic API (Claude), Recharts, Zod, Vitest, Playwright.

## Run it locally

```bash
cd web
npm install
cp .env.example .env.local   # optional: leave Supabase/Anthropic blank for guest mode
npm run dev                  # http://localhost:3000
```

Without any keys the app runs fully in **guest mode**: progress and portfolio live in the
browser, the tutor explains that it isn't configured, and sign-in explains that accounts are off.

## Set up Supabase (accounts and saved progress)

**Non-technical walkthrough (Vercel + Supabase, phone access): [`../docs/DEPLOY.md`](../docs/DEPLOY.md).**
Set `OWNER_EMAIL` on internet-facing deployments so only your signed-in account can sync Trading 212.

1. Create a project at supabase.com (choose a UK/EU region).
2. Apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`,
   or paste `supabase/migrations/*.sql` into the SQL editor.
3. Auth → URL configuration: set the Site URL to your domain and add
   `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to redirect URLs.
   Email (magic link) sign-in is used; configure custom SMTP before launch.
4. Put `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
   in `.env.local` (and in Vercel's environment settings).
5. Load course metadata so progress can reference lessons: run
   `supabase/migrations/20261024000000_course_content.sql` (or `npm run content:sync` with the service
   role key). After editing `src/content`, regenerate that file with `npm run content:sql`.

## Set up the tutor

Add `ANTHROPIC_API_KEY` (server only). The tutor uses `claude-opus-5-5` by default with web
search for current information, server-side refusal fallbacks, a cached system prompt, and
per-user hourly limits (`TUTOR_HOURLY_LIMIT`, guests `TUTOR_GUEST_HOURLY_LIMIT`).

## Connect your own Trading 212 account (personal mode)

For **your own account only**: Trading 212's API terms allow personal use, but offering the
connection to other people needs their written consent.

1. In the Trading 212 app, create an API key (Settings → API). Give it **read-only** permissions:
   account, portfolio, and history (dividends, transactions). Leave orders off. Optionally restrict
   it to your server's IP address.
2. Add `T212_API_KEY`, `T212_API_SECRET` (if you were given one), `T212_ENV` and an
   `T212_ACCESS_CODE` of at least 8 characters to your server's environment variables (Vercel →
   Project → Settings → Environment Variables), then redeploy. Try `T212_ENV=demo` with a
   paper-trading key first if you like.
3. Open Portfolio, enter your access code and press **Sync now**. Holdings, prices at sync time,
   costs, deposits, interest and dividends come in; each sync saves a dated snapshot.

**Your progress is kept.** When you run the app on your own computer, personal mode also saves
your lessons, quiz results, portfolio and sync history to `web/.data/groundwork.json` (protected
by the access code, never committed to git), so it survives cleared browser data and works in any
browser on that computer. The app remembers your access code on each device and re-syncs from
Trading 212 by itself when you open it, at most every 15 minutes. Set `PERSONAL_DATA_FILE` to
store the file elsewhere, or `off` to disable it. On Vercel there's no permanent disk, so use a
Supabase account to keep progress there.

**Tracking, projections and what-ifs** (Portfolio → Projections and what-ifs): a history chart from
your syncs, a simulated range of outcomes (10th–90th percentile) based on editable return and
volatility assumptions, and a tool to test a purchase (new money or selling part of a holding)
and compare concentration, currency exposure, volatility and the projected range before and after.
These are illustrations, not forecasts or recommendations.

The key never reaches the browser. The server only calls read endpoints, caches results for a
minute to respect rate limits, and locks out an address after five wrong access codes. To
disconnect, delete the variables and revoke the key in the Trading 212 app.

## Tests

| Command | What it covers |
|---|---|
| `npm test` | Unit tests: content validity, quiz scoring, mastery/spaced repetition, plan, portfolio maths, currency, missing data, CSV import, scenarios, tutor prompt/context/validation, rate limiting |
| `npm run test:db` | RLS and data isolation through PostgREST against a throwaway Postgres, plus a full SupabaseStore round trip and account deletion. Needs `PGADMIN_URL` and `POSTGREST_BIN` (see `scripts/db-test.sh`) |
| `npm run test:e2e` | Builds and drives the real app in Chromium (desktop and mobile layout) in guest mode, including a Trading 212 sync against a fake API with fictional data |
| `npm run typecheck`, `npm run lint` | Types and lint |

All test data is fictional.

## Layout

```
src/content/         course data (Zod-validated), concept graph, diagnostic
src/lib/learning/    scoring, mastery + spaced repetition, prerequisites, plan
src/lib/portfolio/   metrics, ledger, scenarios, Trading 212 CSV import
src/lib/tutor/       system prompt, context builder, validation, limits
src/lib/store/       AppData, pure actions, guest (localStorage) and Supabase stores
src/app/             screens; api/tutor streams answers
supabase/            migrations (schema + RLS) and the test shim
```

## Deploy (Vercel)

Import the repo, set the root directory to `web`, add the environment variables, deploy.
Vercel's Hobby plan is non-commercial; use Pro once you charge.
