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

1. Create a project at supabase.com (choose a UK/EU region).
2. Apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`,
   or paste `supabase/migrations/*.sql` into the SQL editor.
3. Auth → URL configuration: set the Site URL to your domain and add
   `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to redirect URLs.
   Email (magic link) sign-in is used; configure custom SMTP before launch.
4. Put `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
   in `.env.local` (and in Vercel's environment settings).
5. Load course metadata so progress can reference lessons: `npm run content:sync`
   (re-run whenever `src/content` changes).

## Set up the tutor

Add `ANTHROPIC_API_KEY` (server only). The tutor uses `claude-opus-5-5` by default with web
search for current information, server-side refusal fallbacks, a cached system prompt, and
per-user hourly limits (`TUTOR_HOURLY_LIMIT`, guests `TUTOR_GUEST_HOURLY_LIMIT`).

## Tests

| Command | What it covers |
|---|---|
| `npm test` | Unit tests: content validity, quiz scoring, mastery/spaced repetition, plan, portfolio maths, currency, missing data, CSV import, scenarios, tutor prompt/context/validation, rate limiting |
| `npm run test:db` | RLS and data isolation through PostgREST against a throwaway Postgres, plus a full SupabaseStore round trip and account deletion. Needs `PGADMIN_URL` and `POSTGREST_BIN` (see `scripts/db-test.sh`) |
| `npm run test:e2e` | Builds and drives the real app in Chromium (desktop and mobile layout) in guest mode |
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
