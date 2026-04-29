# Project Overview: ProfitPlanner (Master Technical Spec)

ProfitPlanner is a high-precision, full-stack personal finance application with specialized modules for Debt management, Shared bill splitting, Investment portfolio tracking, and Wealth simulation.

## 🏗️ Technical Architecture

### Frontend Stack
- **Core:** React 18, TypeScript, Vite.
- **UI:** Tailwind CSS, Shadcn UI (Radix), Framer Motion.
- **Charts:** Recharts.
- **FX:** Canvas Confetti.
- **State/Auth:** Supabase Auth + Context API.

### Backend Stack
- **Database:** Supabase (PostgreSQL 15+).
- **Logic:** Row Level Security (RLS) + PostgreSQL Foreign Keys for data integrity.

---

## 🗄️ Database Master Schema (Supabase SQL)

Copy and run this entire script in the **Supabase SQL Editor** to initialize the full project database.

```sql
-- 0. EXTENSIONS & TYPES
create extension if not exists "uuid-ossp";

do $$ begin
  create type public.pp_account_type as enum ('cash', 'bank', 'credit', 'ewallet');
  create type public.pp_split_mode as enum ('amount', 'percent');
exception when duplicate_object then null; end $$;

-- 1. CORE: ACCOUNTS & CATEGORIES
create table if not exists public.pp_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.pp_account_type not null default 'bank',
  currency text not null default 'THB',
  opening_balance numeric(14,2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pp_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  parent_id uuid references public.pp_categories(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. DEBT MODULE
create table if not exists public.pp_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- credit_card, loan, mortgage, etc
  lender text,
  total_amount numeric(14,2) not null,
  remaining_amount numeric(14,2) not null,
  monthly_payment numeric(14,2) not null,
  annual_rate numeric(5,2) default 0,
  start_date date not null,
  due_day integer check (due_day >= 1 and due_day <= 31),
  total_months integer,
  paid_months integer not null default 0,
  note text,
  is_active boolean not null default true,
  account_id uuid references public.pp_accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. TRANSACTIONS (The Central Ledger)
create table if not exists public.pp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.pp_accounts(id) on delete cascade,
  category_id uuid references public.pp_categories(id) on delete set null,
  debt_id uuid references public.pp_debts(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null,
  occurred_on date not null,
  note text,
  created_at timestamptz not null default now()
);

-- 4. SPLIT PAYMENT MODULE
create table if not exists public.pp_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  nickname text,
  color text default '#6366f1',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.pp_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.pp_transactions(id) on delete cascade unique,
  due_date date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.pp_split_participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.pp_splits(id) on delete cascade,
  person_id uuid references public.pp_people(id) on delete cascade, -- null = self
  mode public.pp_split_mode not null default 'amount',
  value numeric(14,2) not null,
  actual_amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (split_id, person_id)
);

create table if not exists public.pp_split_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  split_id uuid not null references public.pp_splits(id) on delete cascade,
  person_id uuid references public.pp_people(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- 5. PORTFOLIO & ASSETS
create table if not exists public.pp_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  full_name text,
  type text not null, -- stock, crypto, fund, gold, etc
  currency text not null default 'THB',
  sector text,
  current_price numeric(24,8) default 0,
  last_price_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pp_asset_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.pp_assets(id) on delete cascade,
  qty numeric(24,8) not null check (qty > 0),
  cost_per_unit numeric(24,8) not null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.pp_asset_price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.pp_assets(id) on delete cascade,
  price numeric(24,8) not null,
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (asset_id, recorded_at)
);

-- 6. AUTOMATIONS & SIMULATOR
create table if not exists public.pp_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pp_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  category_id uuid references public.pp_categories(id) on delete set null,
  account_id uuid references public.pp_accounts(id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null default 'THB',
  frequency text not null, -- daily, weekly, monthly, yearly
  start_date date not null,
  end_date date,
  next_due date,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7. ENABLE RLS (Security)
alter table public.pp_accounts enable row level security;
alter table public.pp_categories enable row level security;
alter table public.pp_transactions enable row level security;
alter table public.pp_debts enable row level security;
alter table public.pp_people enable row level security;
alter table public.pp_splits enable row level security;
alter table public.pp_split_participants enable row level security;
alter table public.pp_split_payments enable row level security;
alter table public.pp_assets enable row level security;
alter table public.pp_asset_lots enable row level security;
alter table public.pp_asset_price_history enable row level security;
alter table public.pp_simulations enable row level security;
alter table public.pp_recurring enable row level security;

-- 8. POLICIES (Simplified: Owner-based access)
-- Note: Replace 'policy_name' with unique names if re-running.
create policy "owner_access_accounts" on pp_accounts for all using (auth.uid() = user_id);
create policy "owner_access_categories" on pp_categories for all using (auth.uid() = user_id);
create policy "owner_access_tx" on pp_transactions for all using (auth.uid() = user_id);
create policy "owner_access_debts" on pp_debts for all using (auth.uid() = user_id);
create policy "owner_access_people" on pp_people for all using (auth.uid() = user_id);
create policy "owner_access_splits" on pp_splits for all using (auth.uid() = user_id);
create policy "owner_access_split_parts" on pp_split_participants for all using (exists (select 1 from pp_splits where id = split_id and user_id = auth.uid()));
create policy "owner_access_split_pay" on pp_split_payments for all using (auth.uid() = user_id);
create policy "owner_access_assets" on pp_assets for all using (auth.uid() = user_id);
create policy "owner_access_lots" on pp_asset_lots for all using (auth.uid() = user_id);
create policy "owner_access_price" on pp_asset_price_history for all using (auth.uid() = user_id);
create policy "owner_access_sim" on pp_simulations for all using (auth.uid() = user_id);
create policy "owner_access_rec" on pp_recurring for all using (auth.uid() = user_id);
```

## 🛠️ Key Developer Instructions

1.  **Date Handling:** All dates are stored as `DATE` strings (YYYY-MM-DD). In React, use `new Date(str + "T00:00:00")` to avoid timezone shifting.
2.  **Duplicate Check:** The `bookRecurringNow` function in `profitPlanner.ts` performs a deep check (Normalized Name + Amount + Month) to prevent double-booking.
3.  **Sync Logic:** Deleting a transaction with a `debt_id` will automatically revert the debt balance.
4.  **Local Dev:** Run `npm run dev` on port 8083.
