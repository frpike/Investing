-- Groundwork initial schema.
-- Conventions:
--   * every user-owned row carries user_id and is protected by RLS (user_id = auth.uid())
--   * child rows reference (parent_id, user_id) so a row can never point at another user's parent
--   * money is numeric + ISO currency; NULL means "unknown", never zero
--   * course content is public-read and written only by the service role (content sync)

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- users ----------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  tutor_topics jsonb not null default '{}',     -- concept id -> times discussed with the tutor
  activity_days date[] not null default '{}',   -- days with learning activity (for the streak)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  experience text check (experience in ('none', 'a_little', 'some', 'confident')),
  goals text[] not null default '{}',
  horizon text check (horizon in ('under_2y', '2_5y', '5_10y', 'over_10y', 'unsure')),
  regular_amount_gbp numeric(12, 2) check (regular_amount_gbp is null or regular_amount_gbp >= 0),
  regular_frequency text check (regular_frequency in ('daily', 'weekly', 'monthly', 'none')),
  has_trading212 text check (has_trading212 in ('yes', 'no', 'planning')),
  focus text check (focus in ('long_term', 'companies', 'both')),
  numeracy_confidence smallint check (numeracy_confidence between 1 and 5),
  skipped text[] not null default '{}',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- course content (public read) ----------
create table public.course_modules (
  id text primary key,
  position smallint not null,
  title text not null,
  summary text not null,
  status text not null default 'available' check (status in ('available', 'coming_soon')),
  content_version text not null,
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id text primary key,
  module_id text not null references public.course_modules (id) on delete cascade,
  position smallint not null,
  title text not null,
  concept_ids text[] not null default '{}',
  content_version text not null,
  updated_at timestamptz not null default now(),
  unique (module_id, position)
);

create table public.quiz_questions (
  id text primary key,
  lesson_id text references public.lessons (id) on delete cascade,
  concept_id text not null,
  is_diagnostic boolean not null default false,
  content_version text not null
);
create index on public.quiz_questions (lesson_id);

-- ---------- learning progress ----------
create table public.diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  score_by_concept jsonb not null,
  taken_at timestamptz not null default now()
);
create index on public.diagnostic_results (user_id, taken_at desc);

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  status text not null check (status in ('started', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text references public.lessons (id) on delete set null,
  context text not null check (context in ('lesson', 'diagnostic', 'review')),
  answers jsonb not null,
  score numeric(5, 4) not null check (score between 0 and 1),
  confidence smallint check (confidence between 1 and 5),
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts (user_id, created_at desc);

create table public.concept_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  concept_id text not null,
  mastery numeric(4, 3) not null default 0 check (mastery between 0 and 1),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  interval_days numeric(7, 2) not null default 0,
  ease numeric(4, 2) not null default 2.5,
  due_at timestamptz,
  last_seen_at timestamptz,
  primary key (user_id, concept_id)
);
create index on public.concept_mastery (user_id, due_at);

-- ---------- portfolios ----------
create table public.data_sources (
  id text primary key, -- e.g. 'manual', 'csv_trading212', 'api_trading212'
  description text not null
);
insert into public.data_sources (id, description) values
  ('manual', 'Entered by the user'),
  ('csv_trading212', 'Imported from a Trading 212 CSV export uploaded by the user'),
  ('api_trading212', 'Read-only Trading 212 API (only with Trading 212 written consent)'),
  ('user_price', 'Price typed in by the user, with the date they gave');

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('manual', 'live', 'practice')),
  name text not null check (char_length(name) between 1 and 80),
  base_currency char(3) not null default 'GBP' check (base_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index on public.portfolios (user_id);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  portfolio_id uuid not null,
  source_id text not null references public.data_sources (id),
  file_name text check (char_length(file_name) <= 200),
  file_sha256 text check (file_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('parsed', 'committed', 'failed', 'discarded')),
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_rejected integer not null default 0,
  errors jsonb not null default '[]',
  created_at timestamptz not null default now(),
  foreign key (portfolio_id, user_id) references public.portfolios (id, user_id) on delete cascade
);
create index on public.import_jobs (user_id, created_at desc);

create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  portfolio_id uuid not null,
  ticker text check (char_length(ticker) <= 32),
  isin text check (isin is null or isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  name text not null check (char_length(name) between 1 and 160),
  asset_type text check (asset_type in ('share', 'etf', 'fund', 'bond', 'cash', 'other')),
  sector text check (char_length(sector) <= 60),   -- user-entered label, used by the sandbox
  region text check (char_length(region) <= 60),   -- user-entered label
  quantity numeric(24, 10) not null check (quantity >= 0),
  instrument_currency char(3) not null check (instrument_currency ~ '^[A-Z]{3}$'),
  avg_price numeric(20, 8),            -- instrument currency, NULL = unknown
  cost_basis_base numeric(20, 4),      -- portfolio base currency, NULL = unknown
  last_price numeric(20, 8),           -- instrument currency, NULL = unknown
  last_price_at timestamptz,
  last_price_source text references public.data_sources (id),
  fx_rate_to_base numeric(20, 10),     -- units of base per 1 instrument currency, NULL = unknown
  source_id text not null references public.data_sources (id),
  import_job_id uuid references public.import_jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((last_price is null) = (last_price_at is null)),
  foreign key (portfolio_id, user_id) references public.portfolios (id, user_id) on delete cascade
);
create index on public.holdings (user_id);
create index on public.holdings (portfolio_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  portfolio_id uuid not null,
  kind text not null check (kind in ('buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee', 'interest', 'fx', 'other')),
  occurred_at timestamptz not null,
  ticker text,
  isin text,
  name text,
  quantity numeric(24, 10),
  price numeric(20, 8),
  price_currency char(3),
  fx_rate numeric(20, 10),
  total_base numeric(20, 4),
  base_currency char(3),
  withholding_tax numeric(20, 4),
  external_ref text check (char_length(external_ref) <= 120),
  source_id text not null references public.data_sources (id),
  import_job_id uuid references public.import_jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (portfolio_id, user_id) references public.portfolios (id, user_id) on delete cascade,
  unique (portfolio_id, external_ref)
);
create index on public.transactions (user_id, occurred_at desc);
create index on public.transactions (portfolio_id);

create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  portfolio_id uuid not null,
  taken_at timestamptz not null default now(),
  total_value_base numeric(20, 4),     -- NULL when any holding lacks a price
  invested_base numeric(20, 4),
  source_id text not null references public.data_sources (id),
  detail jsonb not null default '{}',
  foreign key (portfolio_id, user_id) references public.portfolios (id, user_id) on delete cascade
);
create index on public.portfolio_snapshots (portfolio_id, taken_at desc);

-- ---------- broker connections ----------
-- Metadata the user can see. Credentials live in a separate table with no client access.
create table public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  broker text not null check (broker in ('trading212')),
  environment text not null check (environment in ('live', 'demo')),
  scopes text[] not null default '{}',
  status text not null check (status in ('active', 'revoked', 'error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index on public.broker_connections (user_id);

create table public.broker_credentials (
  connection_id uuid primary key references public.broker_connections (id) on delete cascade,
  key_ciphertext bytea not null,        -- encrypted server-side (AES-GCM, key in server env/KMS)
  secret_ciphertext bytea,
  key_version smallint not null default 1,
  created_at timestamptz not null default now()
);

-- ---------- practice ----------
create table public.practice_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  portfolio_id uuid not null,
  scenario_id text not null,           -- which labelled scenario supplied the price
  scenario_kind text not null check (scenario_kind in ('hypothetical', 'historical')),
  side text not null check (side in ('buy', 'sell')),
  instrument text not null,
  quantity numeric(24, 10) not null check (quantity > 0),
  price numeric(20, 8) not null check (price > 0),
  reasoning text check (char_length(reasoning) <= 4000),
  created_at timestamptz not null default now(),
  foreign key (portfolio_id, user_id) references public.portfolios (id, user_id) on delete cascade
);

create or replace function public.practice_trades_only_on_practice() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.portfolios p where p.id = new.portfolio_id and p.kind = 'practice') then
    raise exception 'practice trades can only be recorded against a practice portfolio';
  end if;
  return new;
end $$;
create trigger practice_trades_kind before insert or update on public.practice_trades
  for each row execute function public.practice_trades_only_on_practice();

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  instrument text not null check (char_length(instrument) <= 160),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, instrument)
);

-- ---------- journal and tutor ----------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  holding_id uuid references public.holdings (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  thesis text, risks text, assumptions text, would_change_mind text,
  horizon text, retrospective text,
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.journal_entries (user_id, created_at desc);

create table public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text check (char_length(title) <= 160),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index on public.tutor_sessions (user_id, created_at desc);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  concept_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.tutor_sessions (id, user_id) on delete cascade
);
create index on public.tutor_messages (session_id, created_at);

-- Server-written usage counters for rate limits and paid tiers. Users may read their own.
create table public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('tutor_message')),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, feature, window_start)
);

-- ---------- updated_at triggers ----------
create trigger t_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_prefs_updated before update on public.learning_preferences for each row execute function public.set_updated_at();
create trigger t_lesson_progress_updated before update on public.lesson_progress for each row execute function public.set_updated_at();
create trigger t_portfolios_updated before update on public.portfolios for each row execute function public.set_updated_at();
create trigger t_holdings_updated before update on public.holdings for each row execute function public.set_updated_at();
create trigger t_journal_updated before update on public.journal_entries for each row execute function public.set_updated_at();

-- ---------- new user bootstrap ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users delete their own account (cascades to every table above).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- row level security ----------
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.data_sources enable row level security;
create policy "content is public" on public.course_modules for select to anon, authenticated using (true);
create policy "content is public" on public.lessons for select to anon, authenticated using (true);
create policy "content is public" on public.quiz_questions for select to anon, authenticated using (true);
create policy "sources are public" on public.data_sources for select to anon, authenticated using (true);
grant select on public.course_modules, public.lessons, public.quiz_questions, public.data_sources to anon, authenticated;

-- Owner-only tables: full CRUD on your own rows.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'learning_preferences', 'diagnostic_results', 'lesson_progress', 'quiz_attempts',
    'concept_mastery', 'portfolios', 'import_jobs', 'holdings', 'transactions', 'portfolio_snapshots',
    'practice_trades', 'watchlist_items', 'journal_entries', 'tutor_sessions', 'tutor_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner reads" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "owner inserts" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner updates" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "owner deletes" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Broker connection metadata: owner can see and delete (disconnect); only the server creates/updates.
alter table public.broker_connections enable row level security;
create policy "owner reads" on public.broker_connections for select to authenticated using (user_id = (select auth.uid()));
create policy "owner deletes" on public.broker_connections for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.broker_connections to authenticated;

-- Credentials: RLS on, no policies, no grants. Only the service role (server) can touch them.
alter table public.broker_credentials enable row level security;
revoke all on public.broker_credentials from anon, authenticated;

-- Usage counters: owner may read; only the server writes.
alter table public.usage_counters enable row level security;
create policy "owner reads" on public.usage_counters for select to authenticated using (user_id = (select auth.uid()));
grant select on public.usage_counters to authenticated;

-- Atomically counts one use of a feature in the current window and reports whether it was allowed.
-- Called by the server with the service role only.
create or replace function public.take_usage(p_user uuid, p_feature text, p_window timestamptz, p_limit integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  insert into public.usage_counters (user_id, feature, window_start, count) values (p_user, p_feature, p_window, 1)
  on conflict (user_id, feature, window_start) do update set count = public.usage_counters.count + 1
    where public.usage_counters.count < p_limit
  returning count into used;
  return coalesce(used, -1); -- -1 = over the limit
end $$;
revoke all on function public.take_usage(uuid, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.take_usage(uuid, text, timestamptz, integer) to service_role;
