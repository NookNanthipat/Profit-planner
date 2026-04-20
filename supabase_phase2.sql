-- =========================================================================
-- ProfitPlanner / FinnFlow — Phase 2 Migration
-- Activity log + Admin RPCs for user/entitlement management
-- Run this entire file in the Supabase SQL Editor.
-- =========================================================================

-- ---------- 1. ACTIVITY LOG ----------
do $$ begin
  create type public.activity_type as enum (
    'signup',
    'login',
    'purchase',
    'trial_started',
    'entitlement_granted',
    'entitlement_revoked',
    'product_status_changed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  type public.activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on public.activity_log (created_at desc);
create index if not exists idx_activity_log_type on public.activity_log (type);

alter table public.activity_log enable row level security;

drop policy if exists "Admins read activity" on public.activity_log;
create policy "Admins read activity"
  on public.activity_log for select
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users insert own activity" on public.activity_log;
create policy "Users insert own activity"
  on public.activity_log for insert
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Trigger: log signup automatically
create or replace function public.log_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (user_id, type, metadata)
  values (new.id, 'signup', jsonb_build_object('email', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_log on auth.users;
create trigger on_auth_user_created_log
  after insert on auth.users
  for each row execute function public.log_signup();

-- ---------- 2. ADMIN RPCs ----------
-- List all users with profile + roles + entitlement counts
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  is_admin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  entitlement_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(p.display_name, split_part(u.email::text, '@', 1)),
    p.avatar_url,
    public.has_role(u.id, 'admin'),
    u.created_at,
    u.last_sign_in_at,
    (select count(*)::int from public.user_products up where up.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- Get one user's entitlements (admin only)
create or replace function public.admin_user_entitlements(_user_id uuid)
returns table (
  id uuid,
  product_id uuid,
  product_slug text,
  product_name text,
  status public.entitlement_status,
  purchased_at timestamptz,
  expired_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select up.id, up.product_id, p.slug, p.name, up.status, up.purchased_at, up.expired_at
  from public.user_products up
  join public.products p on p.id = up.product_id
  where up.user_id = _user_id
  order by up.purchased_at desc;
end;
$$;

-- Grant entitlement (admin)
create or replace function public.admin_grant_entitlement(
  _user_id uuid,
  _product_id uuid,
  _status public.entitlement_status default 'active',
  _expired_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  insert into public.user_products (user_id, product_id, status, expired_at)
  values (_user_id, _product_id, _status, _expired_at)
  on conflict (user_id, product_id)
    do update set status = excluded.status, expired_at = excluded.expired_at
  returning id into _id;

  insert into public.activity_log (user_id, actor_id, type, metadata)
  values (_user_id, auth.uid(), 'entitlement_granted',
    jsonb_build_object('product_id', _product_id, 'status', _status));

  return _id;
end;
$$;

-- Revoke entitlement (admin)
create or replace function public.admin_revoke_entitlement(_user_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _product_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  select user_id, product_id into _user_id, _product_id
  from public.user_products where id = _user_product_id;

  delete from public.user_products where id = _user_product_id;

  insert into public.activity_log (user_id, actor_id, type, metadata)
  values (_user_id, auth.uid(), 'entitlement_revoked',
    jsonb_build_object('product_id', _product_id));
end;
$$;

-- Toggle admin role
create or replace function public.admin_set_role(_user_id uuid, _make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  if _make_admin then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin')
      on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = 'admin';
  end if;
end;
$$;

-- ---------- 3. ADMIN METRICS ----------
create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'new_users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'active_subs', (select count(*) from public.user_products
      where status = 'active' and (expired_at is null or expired_at > now())),
    'trials', (select count(*) from public.user_products
      where status = 'trial' and (expired_at is null or expired_at > now())),
    'total_products', (select count(*) from public.products where is_active = true),
    'signups_30d', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'count', cnt) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', gs)::date as d,
          (select count(*) from auth.users u
            where date_trunc('day', u.created_at) = date_trunc('day', gs)) as cnt
        from generate_series(now() - interval '29 days', now(), interval '1 day') gs
      ) s
    ),
    'top_products', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select p.slug, p.name, count(up.id)::int as cnt
        from public.products p
        left join public.user_products up on up.product_id = p.id
        group by p.slug, p.name
        order by cnt desc
        limit 5
      ) tp
    )
  ) into _result;

  return _result;
end;
$$;

-- Recent activity feed
create or replace function public.admin_recent_activity(_limit integer default 25)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  actor_id uuid,
  actor_email text,
  type public.activity_type,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select a.id, a.user_id, u1.email::text, a.actor_id, u2.email::text,
         a.type, a.metadata, a.created_at
  from public.activity_log a
  left join auth.users u1 on u1.id = a.user_id
  left join auth.users u2 on u2.id = a.actor_id
  order by a.created_at desc
  limit _limit;
end;
$$;

-- ---------- 4. LOG product status changes ----------
create or replace function public.log_product_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.is_active is distinct from new.is_active) or
     (old.is_coming_soon is distinct from new.is_coming_soon) then
    insert into public.activity_log (actor_id, type, metadata)
    values (auth.uid(), 'product_status_changed',
      jsonb_build_object(
        'product_id', new.id,
        'slug', new.slug,
        'is_active', new.is_active,
        'is_coming_soon', new.is_coming_soon
      ));
  end if;
  return new;
end;
$$;

drop trigger if exists on_product_status_change on public.products;
create trigger on_product_status_change
  after update on public.products
  for each row execute function public.log_product_status_change();
