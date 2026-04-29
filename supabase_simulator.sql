-- =========================================================================
-- ProfitPlanner — Simulator Module
-- Table for saving financial planning and retirement simulations.
-- =========================================================================

create table if not exists public.pp_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null, -- Stores the entire simulation settings (assets, rates, years, etc.)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pp_simulations_user_idx on public.pp_simulations(user_id);
alter table public.pp_simulations enable row level security;

drop policy if exists "pp_simulations owner select" on public.pp_simulations;
create policy "pp_simulations owner select" on public.pp_simulations for select using (auth.uid() = user_id);
drop policy if exists "pp_simulations owner insert" on public.pp_simulations;
create policy "pp_simulations owner insert" on public.pp_simulations for insert with check (auth.uid() = user_id);
drop policy if exists "pp_simulations owner update" on public.pp_simulations;
create policy "pp_simulations owner update" on public.pp_simulations for update using (auth.uid() = user_id);
drop policy if exists "pp_simulations owner delete" on public.pp_simulations;
create policy "pp_simulations owner delete" on public.pp_simulations for delete using (auth.uid() = user_id);
