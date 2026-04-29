-- =========================================================================
-- ProfitPlanner — Split Payment Module
-- Tables for managing shared expenses and participant contributions.
-- =========================================================================

-- 1. PEOPLE (Contacts/Friends to split with)
create table if not exists public.pp_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  nickname text,
  color text default '#6366f1',
  avatar_url text,
  created_at timestamptz not null default now()
);

create index if not exists pp_people_user_idx on public.pp_people(user_id);
alter table public.pp_people enable row level security;

drop policy if exists "pp_people owner select" on public.pp_people;
create policy "pp_people owner select" on public.pp_people for select using (auth.uid() = user_id);
drop policy if exists "pp_people owner insert" on public.pp_people;
create policy "pp_people owner insert" on public.pp_people for insert with check (auth.uid() = user_id);
drop policy if exists "pp_people owner update" on public.pp_people;
create policy "pp_people owner update" on public.pp_people for update using (auth.uid() = user_id);
drop policy if exists "pp_people owner delete" on public.pp_people;
create policy "pp_people owner delete" on public.pp_people for delete using (auth.uid() = user_id);

-- 2. SPLITS (Metadata linked to a transaction)
create table if not exists public.pp_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.pp_transactions(id) on delete cascade unique,
  due_date date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists pp_splits_user_idx on public.pp_splits(user_id);
alter table public.pp_splits enable row level security;

drop policy if exists "pp_splits owner select" on public.pp_splits;
create policy "pp_splits owner select" on public.pp_splits for select using (auth.uid() = user_id);
drop policy if exists "pp_splits owner insert" on public.pp_splits;
create policy "pp_splits owner insert" on public.pp_splits for insert with check (auth.uid() = user_id);
drop policy if exists "pp_splits owner update" on public.pp_splits;
create policy "pp_splits owner update" on public.pp_splits for update using (auth.uid() = user_id);
drop policy if exists "pp_splits owner delete" on public.pp_splits;
create policy "pp_splits owner delete" on public.pp_splits for delete using (auth.uid() = user_id);

-- 3. SPLIT PARTICIPANTS (Who owes how much)
do $$ begin
  create type public.pp_split_mode as enum ('amount', 'percent');
exception when duplicate_object then null; end $$;

create table if not exists public.pp_split_participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.pp_splits(id) on delete cascade,
  person_id uuid references public.pp_people(id) on delete cascade, -- null means the user themselves ('self')
  mode public.pp_split_mode not null default 'amount',
  value numeric(14,2) not null, -- The raw input value (amount or percent)
  actual_amount numeric(14,2) not null, -- The calculated THB/Currency share
  created_at timestamptz not null default now(),
  unique (split_id, person_id) -- One entry per person per split. null person_id is unique per split too.
);

alter table public.pp_split_participants enable row level security;

drop policy if exists "pp_split_participants owner select" on public.pp_split_participants;
create policy "pp_split_participants owner select" on public.pp_split_participants 
  for select using (exists (select 1 from pp_splits where id = split_id and user_id = auth.uid()));

drop policy if exists "pp_split_participants owner insert" on public.pp_split_participants;
create policy "pp_split_participants owner insert" on public.pp_split_participants 
  for insert with check (exists (select 1 from pp_splits where id = split_id and user_id = auth.uid()));

drop policy if exists "pp_split_participants owner update" on public.pp_split_participants;
create policy "pp_split_participants owner update" on public.pp_split_participants 
  for update using (exists (select 1 from pp_splits where id = split_id and user_id = auth.uid()));

drop policy if exists "pp_split_participants owner delete" on public.pp_split_participants;
create policy "pp_split_participants owner delete" on public.pp_split_participants 
  for delete using (exists (select 1 from pp_splits where id = split_id and user_id = auth.uid()));

-- 4. SPLIT PAYMENTS (Records of actual money received/paid)
create table if not exists public.pp_split_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  split_id uuid not null references public.pp_splits(id) on delete cascade,
  person_id uuid references public.pp_people(id) on delete cascade, -- Who made the payment
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists pp_split_payments_user_idx on public.pp_split_payments(user_id);
alter table public.pp_split_payments enable row level security;

drop policy if exists "pp_split_payments owner select" on public.pp_split_payments;
create policy "pp_split_payments owner select" on public.pp_split_payments for select using (auth.uid() = user_id);
drop policy if exists "pp_split_payments owner insert" on public.pp_split_payments;
create policy "pp_split_payments owner insert" on public.pp_split_payments for insert with check (auth.uid() = user_id);
drop policy if exists "pp_split_payments owner update" on public.pp_split_payments;
create policy "pp_split_payments owner update" on public.pp_split_payments for update using (auth.uid() = user_id);
drop policy if exists "pp_split_payments owner delete" on public.pp_split_payments;
create policy "pp_split_payments owner delete" on public.pp_split_payments for delete using (auth.uid() = user_id);
