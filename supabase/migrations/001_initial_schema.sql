-- Kill My Idea — Initial Schema
-- Matches DB_SCHEMA.md exactly.
-- Run this in Supabase Dashboard → SQL Editor.

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── Helper: updated_at trigger ──────────────────────────────────────────────

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── profiles ────────────────────────────────────────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  display_name  text,
  role          text not null default 'registered'
                  check (role in ('visitor','registered','paid','admin')),
  plan          text not null default 'free'
                  check (plan in ('free','starter','pro')),
  credit_balance integer not null default 0 check (credit_balance >= 0),
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- ─── ideas ───────────────────────────────────────────────────────────────────

create table public.ideas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  title             text not null check (char_length(title) <= 200),
  raw_input         text not null check (char_length(raw_input) <= 5000),
  target_user       text check (char_length(target_user) <= 500),
  problem_statement text check (char_length(problem_statement) <= 2000),
  status            text not null default 'draft'
                      check (status in ('draft','submitted','analyzing','completed','failed')),
  category          text
                      check (category is null or category in (
                        'b2b_saas','consumer_app','devtool','marketplace','hardware',
                        'fintech','edtech','healthtech','creator_economy','other'
                      )),
  is_quick_roast    boolean not null default false,
  tags              text[],
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index ideas_user_id_idx on public.ideas(user_id);
create index ideas_status_idx on public.ideas(status);
create index ideas_created_at_idx on public.ideas(created_at desc);

create trigger ideas_updated_at
  before update on public.ideas
  for each row execute function public.update_updated_at();

-- ─── idea_versions ───────────────────────────────────────────────────────────

create table public.idea_versions (
  id                      uuid primary key default gen_random_uuid(),
  idea_id                 uuid not null references public.ideas(id) on delete cascade,
  version_number          integer not null,
  structured_summary      jsonb,
  clarification_questions jsonb,
  clarification_answers   jsonb,
  clarification_status    text not null default 'pending'
                            check (clarification_status in ('pending','answered','skipped')),
  created_at              timestamptz not null default now()
);

-- ─── analysis_runs ───────────────────────────────────────────────────────────

create table public.analysis_runs (
  id                uuid primary key default gen_random_uuid(),
  idea_id           uuid not null references public.ideas(id) on delete cascade,
  idea_version_id   uuid not null references public.idea_versions(id) on delete cascade,
  status            text not null default 'queued'
                      check (status in (
                        'queued','interpreting','clarifying','waiting_for_clarification',
                        'collecting_signals','interpreting_signals','scoring',
                        'generating_verdict','generating_report','completed','failed'
                      )),
  current_step      integer,
  input_snapshot    jsonb not null,
  scores            jsonb,
  overall_score     numeric(4,2),
  verdict           text check (verdict is null or verdict in (
                      'pursue','refine','test_first','drop','insufficient_data'
                    )),
  confidence        numeric(3,2),
  assumptions       jsonb,
  red_flags         jsonb,
  green_flags       jsonb,
  override_applied  text,
  override_reason   text,
  model_used        text,
  credits_charged   integer not null default 0,
  error             text,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index analysis_runs_idea_id_idx on public.analysis_runs(idea_id);
create index analysis_runs_status_idx on public.analysis_runs(status);
create index analysis_runs_created_at_idx on public.analysis_runs(created_at desc);

create trigger analysis_runs_updated_at
  before update on public.analysis_runs
  for each row execute function public.update_updated_at();

-- ─── signal_evidence ─────────────────────────────────────────────────────────

create table public.signal_evidence (
  id                uuid primary key default gen_random_uuid(),
  analysis_run_id   uuid not null references public.analysis_runs(id) on delete cascade,
  source_type       text not null check (source_type in ('hackernews')),
  signal_category   text check (signal_category is null or signal_category in (
                      'demand','urgency','distribution','differentiation',
                      'competition','monetization','execution'
                    )),
  raw_data          jsonb not null,
  normalized_summary text,
  signal_strength   numeric(3,2),
  source_url        text,
  created_at        timestamptz not null default now()
);

-- ─── reports ─────────────────────────────────────────────────────────────────

create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  analysis_run_id   uuid not null unique references public.analysis_runs(id) on delete cascade,
  idea_id           uuid not null references public.ideas(id) on delete cascade,
  report_type       text not null default 'full'
                      check (report_type in ('full','quick_roast')),
  content           jsonb not null,
  quick_roast_teaser jsonb,
  created_at        timestamptz not null default now()
);

-- ─── credit_transactions ─────────────────────────────────────────────────────

create table public.credit_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  type                text not null check (type in ('purchase','deduction','refund','adjustment','signup_bonus')),
  amount              integer not null,
  balance_after       integer not null,
  description         text,
  analysis_run_id     uuid references public.analysis_runs(id) on delete set null,
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at          timestamptz not null default now()
);

-- ─── share_links ─────────────────────────────────────────────────────────────

create table public.share_links (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  slug        text not null unique check (char_length(slug) <= 20),
  visibility  text not null default 'unlisted'
                check (visibility in ('public','unlisted')),
  view_count  integer not null default 0,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── admin_settings ──────────────────────────────────────────────────────────

create table public.admin_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create trigger admin_settings_updated_at
  before update on public.admin_settings
  for each row execute function public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- DATABASE FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── handle_new_user: auto-create profile on signup ──────────────────────────

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
declare
  signup_credits integer;
begin
  -- Read the configured free signup credits (default 3 if not set)
  select coalesce((value::text)::integer, 3)
    into signup_credits
    from public.admin_settings
    where key = 'free_signup_credits';

  if signup_credits is null then
    signup_credits := 3;
  end if;

  insert into public.profiles (id, email, role, plan, credit_balance)
  values (
    new.id,
    new.email,
    'registered',
    'free',
    signup_credits
  );

  -- Record the signup bonus as a credit transaction
  if signup_credits > 0 then
    insert into public.credit_transactions (user_id, type, amount, balance_after, description)
    values (new.id, 'signup_bonus', signup_credits, signup_credits, 'Free credits on signup');
  end if;

  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── deduct_credits: atomic credit deduction ─────────────────────────────────

create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text default 'Analysis credit',
  p_analysis_run_id uuid default null
)
returns integer
security definer
set search_path = public
as $$
declare
  current_balance integer;
  new_balance integer;
begin
  -- Lock the row to prevent concurrent deductions
  select credit_balance into current_balance
    from public.profiles
    where id = p_user_id
    for update;

  if current_balance is null then
    raise exception 'User not found: %', p_user_id;
  end if;

  if current_balance < p_amount then
    raise exception 'Insufficient credits. Balance: %, Required: %', current_balance, p_amount;
  end if;

  new_balance := current_balance - p_amount;

  update public.profiles
    set credit_balance = new_balance
    where id = p_user_id;

  insert into public.credit_transactions (user_id, type, amount, balance_after, description, analysis_run_id)
  values (p_user_id, 'deduction', -p_amount, new_balance, p_description, p_analysis_run_id);

  return new_balance;
end;
$$ language plpgsql;

-- ─── add_credits: atomic credit addition ─────────────────────────────────────

create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text default 'Credit purchase',
  p_razorpay_order_id text default null,
  p_razorpay_payment_id text default null
)
returns integer
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
    set credit_balance = credit_balance + p_amount
    where id = p_user_id
    returning credit_balance into new_balance;

  if new_balance is null then
    raise exception 'User not found: %', p_user_id;
  end if;

  insert into public.credit_transactions (user_id, type, amount, balance_after, description, razorpay_order_id, razorpay_payment_id)
  values (p_user_id, 'purchase', p_amount, new_balance, p_description, p_razorpay_order_id, p_razorpay_payment_id);

  return new_balance;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_versions enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.signal_evidence enable row level security;
alter table public.reports enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.share_links enable row level security;
alter table public.admin_settings enable row level security;

-- ─── profiles ────────────────────────────────────────────────────────────────

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── ideas ───────────────────────────────────────────────────────────────────

create policy "Users can read own ideas"
  on public.ideas for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "Admins can read all ideas"
  on public.ideas for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Authenticated users can insert ideas"
  on public.ideas for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ideas"
  on public.ideas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── idea_versions ───────────────────────────────────────────────────────────

create policy "Users can read own idea versions"
  on public.idea_versions for select
  using (
    exists (select 1 from public.ideas where ideas.id = idea_versions.idea_id and ideas.user_id = auth.uid())
  );

create policy "Users can insert idea versions for own ideas"
  on public.idea_versions for insert
  with check (
    exists (select 1 from public.ideas where ideas.id = idea_versions.idea_id and ideas.user_id = auth.uid())
  );

-- ─── analysis_runs ───────────────────────────────────────────────────────────

create policy "Users can read own analysis runs"
  on public.analysis_runs for select
  using (
    exists (select 1 from public.ideas where ideas.id = analysis_runs.idea_id and ideas.user_id = auth.uid())
  );

create policy "Users can insert analysis runs for own ideas"
  on public.analysis_runs for insert
  with check (
    exists (select 1 from public.ideas where ideas.id = analysis_runs.idea_id and ideas.user_id = auth.uid())
  );

create policy "Admins can read all analysis runs"
  on public.analysis_runs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update analysis runs"
  on public.analysis_runs for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─── signal_evidence ─────────────────────────────────────────────────────────

create policy "Users can read signal evidence for own ideas"
  on public.signal_evidence for select
  using (
    exists (
      select 1 from public.analysis_runs ar
      join public.ideas i on i.id = ar.idea_id
      where ar.id = signal_evidence.analysis_run_id and i.user_id = auth.uid()
    )
  );

create policy "Admins can read all signal evidence"
  on public.signal_evidence for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─── reports ─────────────────────────────────────────────────────────────────

create policy "Users can read own reports"
  on public.reports for select
  using (
    exists (select 1 from public.ideas where ideas.id = reports.idea_id and ideas.user_id = auth.uid())
  );

create policy "Admins can read all reports"
  on public.reports for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─── credit_transactions ─────────────────────────────────────────────────────

create policy "Users can read own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

create policy "Admins can read all transactions"
  on public.credit_transactions for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ─── share_links ─────────────────────────────────────────────────────────────

create policy "Users can create share links for own reports"
  on public.share_links for insert
  with check (
    exists (
      select 1 from public.reports r
      join public.ideas i on i.id = r.idea_id
      where r.id = share_links.report_id and i.user_id = auth.uid()
    )
  );

create policy "Anyone can read share links by slug"
  on public.share_links for select
  using (true);

-- ─── admin_settings ──────────────────────────────────────────────────────────

create policy "Admins can read admin settings"
  on public.admin_settings for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update admin settings"
  on public.admin_settings for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert admin settings"
  on public.admin_settings for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.admin_settings (key, value) values
  ('free_signup_credits', '3'),
  ('signal_providers', '{"hackernews": {"enabled": true}}'),
  ('classification_method', '"llm"'),
  ('credit_packages', '[{"id":"pack_5","credits":5,"price_inr":99},{"id":"pack_20","credits":20,"price_inr":299},{"id":"pack_50","credits":50,"price_inr":599}]'),
  ('scoring_weights', '{"demand":0.20,"urgency":0.20,"distribution":0.20,"differentiation":0.12,"competition":0.10,"monetization":0.10,"execution":0.08}');
