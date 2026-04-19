-- =========================================================================
-- ProfitPlanner — Phase 1 Database Setup
-- Run this entire file in the Supabase SQL Editor for project ydaogwwblzjmjsbadivv
-- =========================================================================

-- ---------- 1. PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. ROLES (admin) ----------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

drop policy if exists "Admins manage roles" on public.user_roles;
create policy "Admins manage roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------- 3. PRODUCTS ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'usd',
  is_active boolean not null default true,
  is_coming_soon boolean not null default false,
  app_route text, -- e.g. /app/profit-planner
  badge text, -- e.g. Premium, Free, Beta
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products for select
  using (is_active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------- 4. USER_PRODUCTS (entitlements) ----------
do $$ begin
  create type public.entitlement_status as enum ('active', 'inactive', 'trial', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status public.entitlement_status not null default 'active',
  purchased_at timestamptz not null default now(),
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.user_products enable row level security;

drop policy if exists "Users view own entitlements" on public.user_products;
create policy "Users view own entitlements"
  on public.user_products for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- For Phase 1 (mock checkout): allow user to insert their own purchase
drop policy if exists "Users can create own entitlement" on public.user_products;
create policy "Users can create own entitlement"
  on public.user_products for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own entitlement" on public.user_products;
create policy "Users can update own entitlement"
  on public.user_products for update
  using (auth.uid() = user_id);

drop policy if exists "Admins manage entitlements" on public.user_products;
create policy "Admins manage entitlements"
  on public.user_products for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Helper: check if user has access (active or non-expired trial)
create or replace function public.user_has_product_access(_user_id uuid, _product_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_products up
    join public.products p on p.id = up.product_id
    where up.user_id = _user_id
      and p.slug = _product_slug
      and up.status in ('active', 'trial')
      and (up.expired_at is null or up.expired_at > now())
  )
$$;

-- ---------- 5. SEED PRODUCTS ----------
insert into public.products (slug, name, description, price_cents, app_route, badge, is_coming_soon)
values
  ('profit-planner', 'ProfitPlanner App', 'Personal finance dashboard with smart insights and goal tracking.', 1900, '/app/profit-planner', 'Premium', false),
  ('ai-advisor', 'AI Budget Advisor', 'AI-powered spending analysis and personalized financial coaching.', 2900, null, 'Coming Soon', true),
  ('sme-erp', 'SME ERP Suite', 'Lightweight ERP for small business: invoicing, inventory, and accounting.', 4900, null, 'Coming Soon', true)
on conflict (slug) do nothing;

-- ---------- 6. MAKE YOURSELF AN ADMIN ----------
-- Replace 'you@example.com' with your email, then run:
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'you@example.com'
-- on conflict do nothing;
