# Groundwork: product assessment and build plan

*Working name, easy to change. Written 17 October 2026. Anything marked
**verify** must be checked with the source or a professional before launch.*

This answers the six "start by" questions in your brief: scope, the Trading 212
findings, architecture and schema, services and costs, the build order, and the
main risks.

---

## 1. Scope and the smallest useful MVP

The brief describes roughly 12 to 18 months of solo work: 10 modules, an AI tutor,
a broker integration, market news, a practice simulator, a journal, spaced
repetition and billing. The MVP has to prove one thing first:

> **Can a beginner go from zero to understanding their own portfolio, with a tutor
> that stays honest?**

**MVP (Phase 1, being built now)**

| In | Out (later phases) |
|---|---|
| Landing page, sign-up (Supabase Auth), guest mode | Billing, usage tiers |
| Onboarding questions and a 7-topic diagnostic quiz, with a generated learning plan | News and market events (needs licensed data) |
| Course engine (structured content, reusable blocks) plus **Module 1 complete** | Modules 2 to 10 content (the engine is ready; content is the work) |
| Lesson quizzes, concept mastery, spaced-repetition review queue | Historical market scenarios (needs licensed data) |
| AI tutor (server-side key, guardrails, lesson links, portfolio-aware) | Decision journal with tutor review (Phase 3) |
| Manual portfolio entry, Trading 212 CSV import, metrics with shown working | Live Trading 212 API (blocked: see section 2) |
| Hypothetical portfolio sandbox (fall, FX move, dividend, mixed moves) | Virtual trading with real historical prices |
| Progress page, data export, account and data deletion | Sector and geography look-through for ETFs |

Guest mode keeps everything in the browser until someone signs up, then moves it
into their account. Beginners can try the product without handing over an email
address, and the dashboard is useful with no money invested.

---

## 2. Trading 212 API: what I found

Sources, read on 17 October 2026: the [API docs](https://docs.trading212.com/api) and
the [API Terms](https://www.trading212.com/legal-documentation/API-Terms_EN.pdf),
last updated 17 October 2025.

| Question | Finding |
|---|---|
| Account types | **Invest and Stocks ISA only.** No CFD account, no SIPP. Multi-currency accounts are not supported. |
| Data available | Account summary (cash, invested value, realised and unrealised P/L), open positions (quantity, average price, current price, cost, value, FX impact), order history, dividends, transactions (deposits, withdrawals, fees, interest), and asynchronous CSV exports. Pies endpoints are **deprecated**. |
| Prices and history | Current price only for instruments you hold. **No historical prices or portfolio value history.** The terms say "You will not receive real-time information on Market Data". |
| Who can use it | Retail users generate a key and secret in the Trading 212 app. Keys can be IP-restricted. Endpoints check scopes (e.g. `portfolio`, `history:dividends`), so read-only keys are possible. |
| Auth | HTTP Basic with `API_KEY:API_SECRET`. **No OAuth.** Users would have to paste keys into our app. |
| Rate limits | Per account, e.g. positions 1 request/second; dividends and transactions 20/minute; headers report what's left. |
| Sandbox | Yes. A paper-trading demo environment at `demo.trading212.com`. |
| Status | **Beta**, "under active development". |
| **Commercial use** | **Not permitted without written consent.** Clause 6.2: access is "solely for your personal use … and only for testing purposes". Clause 6.3: apps "intended for use by other end-users" need Trading 212's "prior written consent", and launching without it means access is "revoked immediately". Clause 4.2 also bans commercial services, and clause 7.1(e) bans redistributing market data. |

**Decision.** For a product other people use, the safest supported route is:

1. **CSV import** (built in Phase 1). Users export their history from Trading 212
   and upload it. We never see their credentials, and it works for every account
   type that can export.
2. **Manual entry** (built in Phase 1).
3. **Read-only API connection: only after Trading 212 gives written consent.**
   The integration module is designed for it: encrypted credential storage,
   scopes and disconnect are all in the schema. It stays switched off behind a
   feature flag. Email Trading 212 early; their answer shapes Phase 2.

The app's **personal mode** (built after this plan was written) applies the same rule: the deployment owner connects their own account with a read-only key held in server environment variables, behind an access code. It must not be switched on for a copy other people use.

Your personal sync script (`sync/t212_sync.py`) is fine under clause 6.2,
because it is your own key for your own use. It must not be offered to other users.

**What a CSV can and can't give us.** Trading 212's history export lists buys,
sells, dividends, deposits and fees. From it we can rebuild quantities, average
cost, realised gains and dividends. It **does not contain today's price**, so the
current value either comes from prices the user types in (labelled
"user-entered, as of <date>") or stays shown as *unknown*, never as £0. The
parser reads columns by header name and reports rows it can't read. I wrote it
from the export format as I understand it. **Verify** with a real export file
before relying on it.

---

## 3. Architecture

```
Browser (Next.js 16 App Router, React 19, Tailwind 4, shadcn-style components)
  ├─ Static/prerendered: landing, course catalogue, lesson content (from /content)
  ├─ Client islands: quiz, exercises, portfolio, sandbox, tutor chat
  └─ Data access through one Store interface
        ├─ GuestStore     → localStorage (try without an account)
        └─ SupabaseStore  → Supabase Postgres via supabase-js, protected by RLS

Next.js server (Vercel)
  ├─ /api/tutor   → verifies the Supabase session, rate-limits, validates with Zod,
  │                 builds context from VERIFIED data, streams from Claude
  ├─ /api/import  → (Phase 2) server-side CSV validation and audit log
  └─ secrets: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY (server only)

Supabase: Postgres + Auth + RLS on every user table
Anthropic API: Claude (tutor), with web search tool for dated, cited current info
```

**Module boundaries** (folders under `web/src/`):
`content/` (course data), `lib/learning/` (scoring, mastery, plan, spaced
repetition), `lib/portfolio/` (calculations, CSV import, sandbox),
`lib/tutor/` (prompt, guardrails, context), `lib/store/` (persistence),
`lib/supabase/` (auth clients), `app/` (screens), `components/` (design system).
Broker integrations, market data and analytics are separate modules that get
added when their phase starts.

**Why this shape.** Course content is plain typed data checked by Zod, so adding
modules means adding files, not code. Every money calculation is a pure function
with tests. "Unknown" is a real state, not zero. The tutor only sees what the
server can vouch for: signed-in users' data comes from the database, and guest
data is labelled "user-entered, unverified" in the prompt.

### Database schema (see `supabase/migrations/`)

| Area | Tables |
|---|---|
| Users | `profiles` (1:1 with `auth.users`), `learning_preferences` |
| Content | `course_modules`, `lessons`, `quiz_questions` (synced from `/content`; public read) |
| Learning | `quiz_attempts`, `lesson_progress`, `concept_mastery` (with spaced-repetition due dates), `diagnostic_results` |
| Portfolio | `portfolios` (kind: `live` / `manual` / `practice`), `holdings`, `transactions`, `portfolio_snapshots`, `import_jobs`, `data_sources` |
| Broker | `broker_connections` (metadata) and `broker_credentials` (encrypted, **no client access at all**) |
| Practice | `practice_trades` (only allowed on `practice` portfolios, enforced by a trigger), `watchlist_items` |
| Reflection | `journal_entries`, `tutor_sessions`, `tutor_messages` |

Every user table has `user_id` with RLS `user_id = auth.uid()`. Money is stored
as `numeric` plus a currency code; nullable means "unknown", never zero.
Deleting a user cascades to all their rows.

---

## 4. External services and likely costs

| Service | Needed for | Cost (check current pricing) |
|---|---|---|
| Supabase | DB, auth | Free tier for building; Pro about $25/month for production (backups, no pausing) |
| Vercel | Hosting | Hobby is **non-commercial only**; Pro about $20/month per member once you charge |
| Anthropic API | Tutor | Claude Opus 5.5 at $4 / $20 per million input/output tokens. A typical tutor turn (~6k input, mostly cacheable; ~600 output) costs about **2–4p**. 1,000 users × 20 questions/month ≈ £400–800/month, which is why tutor usage is the natural paid-tier limit. Model is set by `TUTOR_MODEL` if you want a cheaper one. |
| Web search (tutor) | Current, cited info | Charged per search on top of tokens; capped at 3 per answer |
| Email (auth) | Magic links | Supabase's built-in email is rate-limited; add Resend/Postmark (free tiers) before launch |
| Market data | News, prices, history | Not in Phase 1. Needs a **licensed** provider (tens to hundreds of £/month); Trading 212 data can't be redistributed |
| ICO data protection fee | Legal | Required for most UK businesses processing personal data; tier 1 is about £52/year (**verify**) |
| Domain | | ~£10–15/year |

Keys you'll need: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(public by design, protected by RLS), `SUPABASE_SERVICE_ROLE_KEY` (server only,
never in the browser), `ANTHROPIC_API_KEY` (server only). See `web/.env.example`.

---

## 5. Implementation plan (dependency order)

**Phase 1: education MVP**
1. Schema, RLS and data-isolation tests (done first, because everything depends on it)
2. Content model, concept graph, Module 1, diagnostic
3. Learning engine: quiz scoring, mastery, spaced repetition, plan generator
4. Portfolio maths, CSV import, sandbox
5. Store layer (guest and Supabase) and auth
6. Screens: landing → onboarding → dashboard → learn → lesson/quiz → tutor → portfolio → progress → settings/privacy
7. Tutor API with guardrails
8. End-to-end tests, build, deploy guide

**Phase 2: real portfolio data.** Server-side import pipeline with an audit log,
user-entered price snapshots, FX handling, holding detail pages, Modules 2–4.
Live Trading 212 connection only if written consent arrives.

**Phase 3: advanced learning.** Licensed market data, news explainers with
sources, historical scenarios, decision journal with tutor review, Modules 5–10.

**Phase 4: commercial readiness.** Billing (Stripe), usage limits, monitoring,
external security review, legal review, user testing.

---

## 6. Main risks

**Regulatory (UK), all to verify with a solicitor who knows the FCA perimeter
before charging money:**
- *Advising on investments* is a regulated activity. FCA guidance says advice
  must be about a **particular investment** to be regulated advice. Generic advice,
  such as comparing asset classes or explaining how ETFs work, falls outside that
  test, but it can still be a **financial promotion**
  ([PERG 8.26](https://handbook.fca.org.uk/handbook/PERG/8/26.html),
  [PERG 8.28](https://www.Handbook.fca.org.uk/handbook/PERG/8/28.pdf),
  [PERG 8 Annex 1](https://www.Handbook.fca.org.uk/handbook/PERG/8/Annex1.pdf)).
  The riskiest feature is the **tutor discussing a user's own holdings**: an
  opinion about whether *they* should hold or sell *that* share starts to look
  like a personal recommendation. The tutor is built to explain and never
  recommend. That reduces the risk but doesn't remove it, and a disclaimer alone
  does not make it compliant.
- *Financial promotions*: anything that invites or induces someone to invest,
  including naming specific products in a positive light, can be a promotion that
  must be approved by an authorised firm. Lesson examples use dated, factual data
  and present each instrument neutrally.
- *Trading 212 terms*: shipping the API integration to other users without
  consent breaches clause 6.3.
- *Data protection*: financial data is sensitive in practice. This needs a UK GDPR
  lawful basis (contract plus consent for imports), a privacy notice, data export
  and deletion (built), minimal retention, a processor list (Supabase, Vercel,
  Anthropic) and ICO registration.

**Security:** RLS on every table (tested), service-role key server-only, broker
credentials unreadable from the client (tested), Zod validation on every server
input, per-user rate limits on the tutor, no secrets in git.

**Product and AI safety:** the tutor inventing prices or news. Mitigations: it
gets only verified data with timestamps, must cite web sources, and is told to
say "I don't know"; the guardrail tests cover this. Also **gamification creep**:
there are no profit leaderboards, and streaks are shown next to measured mastery,
never in place of it.
