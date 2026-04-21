-- =========================================================================
-- ProfitPlanner — Phase A (Setup + Transactions + Monthly Dashboard)
-- Run this in the Supabase SQL Editor.
-- =========================================================================

-- Enums
do $$ begin
  create type public.pp_account_type as enum ('cash','bank','credit','ewallet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pp_tx_type as enum ('income','expense');
exception when duplicate_object then null; end $$;

-- =================== ACCOUNTS ===================
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
create index if not exists pp_accounts_user_idx on public.pp_accounts(user_id);
alter table public.pp_accounts enable row level security;

drop policy if exists "pp_accounts owner select" on public.pp_accounts;
create policy "pp_accounts owner select" on public.pp_accounts
  for select using (auth.uid() = user_id);
drop policy if exists "pp_accounts owner insert" on public.pp_accounts;
create policy "pp_accounts owner insert" on public.pp_accounts
  for insert with check (auth.uid() = user_id);
drop policy if exists "pp_accounts owner update" on public.pp_accounts;
create policy "pp_accounts owner update" on public.pp_accounts
  for update using (auth.uid() = user_id);
drop policy if exists "pp_accounts owner delete" on public.pp_accounts;
create policy "pp_accounts owner delete" on public.pp_accounts
  for delete using (auth.uid() = user_id);

-- =================== CATEGORIES ===================
create table if not exists public.pp_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.pp_tx_type not null,
  icon text,
  color text,
  parent_id uuid references public.pp_categories(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pp_categories_user_idx on public.pp_categories(user_id);
alter table public.pp_categories enable row level security;

drop policy if exists "pp_categories owner select" on public.pp_categories;
create policy "pp_categories owner select" on public.pp_categories
  for select using (auth.uid() = user_id);
drop policy if exists "pp_categories owner insert" on public.pp_categories;
create policy "pp_categories owner insert" on public.pp_categories
  for insert with check (auth.uid() = user_id);
drop policy if exists "pp_categories owner update" on public.pp_categories;
create policy "pp_categories owner update" on public.pp_categories
  for update using (auth.uid() = user_id);
drop policy if exists "pp_categories owner delete" on public.pp_categories;
create policy "pp_categories owner delete" on public.pp_categories
  for delete using (auth.uid() = user_id);

-- =================== TRANSACTIONS ===================
create table if not exists public.pp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.pp_accounts(id) on delete cascade,
  category_id uuid references public.pp_categories(id) on delete set null,
  type public.pp_tx_type not null,
  amount numeric(14,2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists pp_tx_user_date_idx on public.pp_transactions(user_id, occurred_on desc);
alter table public.pp_transactions enable row level security;

drop policy if exists "pp_tx owner select" on public.pp_transactions;
create policy "pp_tx owner select" on public.pp_transactions
  for select using (auth.uid() = user_id);
drop policy if exists "pp_tx owner insert" on public.pp_transactions;
create policy "pp_tx owner insert" on public.pp_transactions
  for insert with check (auth.uid() = user_id);
drop policy if exists "pp_tx owner update" on public.pp_transactions;
create policy "pp_tx owner update" on public.pp_transactions
  for update using (auth.uid() = user_id);
drop policy if exists "pp_tx owner delete" on public.pp_transactions;
create policy "pp_tx owner delete" on public.pp_transactions
  for delete using (auth.uid() = user_id);

-- =================== RPC: Monthly summary ===================
create or replace function public.pp_monthly_summary(_user_id uuid, _month date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  start_d date := date_trunc('month', _month)::date;
  end_d   date := (date_trunc('month', _month) + interval '1 month' - interval '1 day')::date;
  income_total numeric := 0;
  expense_total numeric := 0;
  by_category jsonb := '[]'::jsonb;
  daily jsonb := '[]'::jsonb;
begin
  select coalesce(sum(amount),0) into income_total
    from pp_transactions
    where user_id = _user_id and type='income' and occurred_on between start_d and end_d;

  select coalesce(sum(amount),0) into expense_total
    from pp_transactions
    where user_id = _user_id and type='expense' and occurred_on between start_d and end_d;

  select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) into by_category from (
    select c.id as category_id, coalesce(c.name,'Uncategorized') as name,
           c.color, c.icon, sum(tx.amount)::numeric as total
    from pp_transactions tx
    left join pp_categories c on c.id = tx.category_id
    where tx.user_id = _user_id and tx.type='expense'
      and tx.occurred_on between start_d and end_d
    group by c.id, c.name, c.color, c.icon
    order by total desc
  ) t;

  select coalesce(jsonb_agg(row_to_json(d)),'[]'::jsonb) into daily from (
    select occurred_on as date,
           sum(case when type='income' then amount else 0 end)::numeric as income,
           sum(case when type='expense' then amount else 0 end)::numeric as expense
    from pp_transactions
    where user_id = _user_id and occurred_on between start_d and end_d
    group by occurred_on
    order by occurred_on
  ) d;

  return jsonb_build_object(
    'income', income_total,
    'expense', expense_total,
    'net', income_total - expense_total,
    'savings_rate', case when income_total > 0 then ((income_total - expense_total)/income_total) else 0 end,
    'by_category', by_category,
    'daily', daily,
    'start', start_d,
    'end', end_d
  );
end;
$$;

grant execute on function public.pp_monthly_summary(uuid, date) to authenticated;
