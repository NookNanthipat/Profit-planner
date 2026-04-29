-- =========================================================================
-- ProfitPlanner — Portfolio Module
-- Tables for tracking investment assets, purchase lots, and price history.
-- =========================================================================

-- 1. ASSETS (The master list of holdings)
create table if not exists public.pp_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, -- Symbol or Short Name (e.g., PTT, BTC, Gold)
  full_name text,
  type text not null, -- stock, stock_us, fund, gold, crypto, bond, cash, property, other
  sub_portfolio text default 'Main Portfolio',
  currency text not null default 'THB',
  sector text,
  current_price numeric(24,8) default 0,
  last_price_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pp_assets_user_idx on public.pp_assets(user_id);
alter table public.pp_assets enable row level security;

drop policy if exists "pp_assets owner select" on public.pp_assets;
create policy "pp_assets owner select" on public.pp_assets for select using (auth.uid() = user_id);
drop policy if exists "pp_assets owner insert" on public.pp_assets;
create policy "pp_assets owner insert" on public.pp_assets for insert with check (auth.uid() = user_id);
drop policy if exists "pp_assets owner update" on public.pp_assets;
create policy "pp_assets owner update" on public.pp_assets for update using (auth.uid() = user_id);
drop policy if exists "pp_assets owner delete" on public.pp_assets;
create policy "pp_assets owner delete" on public.pp_assets for delete using (auth.uid() = user_id);

-- 2. ASSET LOTS (Individual purchase records)
create table if not exists public.pp_asset_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.pp_assets(id) on delete cascade,
  qty numeric(24,8) not null check (qty > 0),
  cost_per_unit numeric(24,8) not null check (cost_per_unit >= 0),
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists pp_asset_lots_asset_idx on public.pp_asset_lots(asset_id);
alter table public.pp_asset_lots enable row level security;

drop policy if exists "pp_asset_lots owner select" on public.pp_asset_lots;
create policy "pp_asset_lots owner select" on public.pp_asset_lots 
  for select using (auth.uid() = user_id);

drop policy if exists "pp_asset_lots owner insert" on public.pp_asset_lots;
create policy "pp_asset_lots owner insert" on public.pp_asset_lots 
  for insert with check (auth.uid() = user_id);

drop policy if exists "pp_asset_lots owner update" on public.pp_asset_lots;
create policy "pp_asset_lots owner update" on public.pp_asset_lots 
  for update using (auth.uid() = user_id);

drop policy if exists "pp_asset_lots owner delete" on public.pp_asset_lots;
create policy "pp_asset_lots owner delete" on public.pp_asset_lots 
  for delete using (auth.uid() = user_id);

-- 3. ASSET PRICE HISTORY (For chart visualization)
create table if not exists public.pp_asset_price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.pp_assets(id) on delete cascade,
  price numeric(24,8) not null,
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (asset_id, recorded_at)
);

create index if not exists pp_asset_price_hist_asset_idx on public.pp_asset_price_history(asset_id);
alter table public.pp_asset_price_history enable row level security;

drop policy if exists "pp_asset_price_history owner select" on public.pp_asset_price_history;
create policy "pp_asset_price_history owner select" on public.pp_asset_price_history 
  for select using (auth.uid() = user_id);

drop policy if exists "pp_asset_price_history owner insert" on public.pp_asset_price_history;
create policy "pp_asset_price_history owner insert" on public.pp_asset_price_history 
  for insert with check (auth.uid() = user_id);

drop policy if exists "pp_asset_price_history owner update" on public.pp_asset_price_history;
create policy "pp_asset_price_history owner update" on public.pp_asset_price_history 
  for update using (auth.uid() = user_id);

drop policy if exists "pp_asset_price_history owner delete" on public.pp_asset_price_history;
create policy "pp_asset_price_history owner delete" on public.pp_asset_price_history 
  for delete using (auth.uid() = user_id);

-- 4. MARKET CACHE (Shared price cache to reduce API calls)
create table if not exists public.pp_market_cache (
  symbol text primary key,
  price numeric(24,8) not null,
  name text,
  logo_url text,
  source text,
  updated_at timestamptz not null default now()
);

alter table public.pp_market_cache enable row level security;

drop policy if exists "Anyone can read market cache" on public.pp_market_cache;
create policy "Anyone can read market cache" on public.pp_market_cache 
  for select using (true);

drop policy if exists "Authenticated users can upsert market cache" on public.pp_market_cache;
create policy "Authenticated users can upsert market cache" on public.pp_market_cache 
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update market cache" on public.pp_market_cache;
create policy "Authenticated users can update market cache" on public.pp_market_cache 
  for update using (auth.role() = 'authenticated');
