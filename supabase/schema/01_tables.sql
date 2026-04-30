-- ============================================================
-- 01_tables.sql — All Table Definitions
-- Project: ProfitPlanner (ydaogwwblzjmjsbadivv)
-- Last synced: 2026-04-30
-- Note: Run 00_types.sql first
-- ============================================================

-- ─── Platform / Auth Tables ───────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  display_name text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_roles (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

CREATE TABLE public.products (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  name_th        text,
  description    text,
  description_th text,
  price_cents    integer NOT NULL DEFAULT 0,
  price_thb      integer,
  currency       text NOT NULL DEFAULT 'usd',
  is_active      boolean NOT NULL DEFAULT true,
  is_coming_soon boolean NOT NULL DEFAULT false,
  app_route      text,
  badge          text,
  sort_order     integer DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_products (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status       public.entitlement_status NOT NULL DEFAULT 'active',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expired_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_products_pkey PRIMARY KEY (id),
  CONSTRAINT user_products_user_id_product_id_key UNIQUE (user_id, product_id)
);

CREATE TABLE public.activity_log (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type       public.activity_type NOT NULL,
  metadata   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id)
);

-- ─── ProfitPlanner App Tables (pp_*) ─────────────────────────────────────────

CREATE TABLE public.pp_accounts (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  type            public.pp_account_type NOT NULL DEFAULT 'bank',
  currency        text NOT NULL DEFAULT 'THB',
  opening_balance numeric NOT NULL DEFAULT 0,
  archived        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_accounts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_categories (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       public.pp_tx_type NOT NULL,
  icon       text,
  color      text,
  parent_id  uuid REFERENCES public.pp_categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_transactions (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES public.pp_accounts(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.pp_categories(id) ON DELETE SET NULL,
  debt_id     uuid REFERENCES public.pp_debts(id) ON DELETE SET NULL,
  type        public.pp_tx_type NOT NULL,
  amount      numeric NOT NULL CHECK (amount >= 0),
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_debts (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id       uuid REFERENCES public.pp_accounts(id) ON DELETE SET NULL,
  name             text NOT NULL,
  type             text NOT NULL CHECK (type = ANY (ARRAY['credit_card','installment','mortgage','car','personal','other'])),
  lender           text,
  total_amount     numeric NOT NULL CHECK (total_amount > 0),
  remaining_amount numeric NOT NULL CHECK (remaining_amount >= 0),
  monthly_payment  numeric NOT NULL CHECK (monthly_payment >= 0),
  annual_rate      numeric NOT NULL DEFAULT 0 CHECK (annual_rate >= 0),
  start_date       date NOT NULL,
  due_day          integer CHECK (due_day >= 1 AND due_day <= 31),
  total_months     integer,
  paid_months      integer NOT NULL DEFAULT 0,
  note             text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_debts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_recurring (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.pp_categories(id) ON DELETE SET NULL,
  account_id  uuid REFERENCES public.pp_accounts(id) ON DELETE SET NULL,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type = ANY (ARRAY['income','expense'])),
  amount      numeric NOT NULL CHECK (amount > 0),
  currency    text NOT NULL DEFAULT 'THB',
  frequency   text NOT NULL CHECK (frequency = ANY (ARRAY['daily','weekly','biweekly','monthly','quarterly','biannual','yearly'])),
  start_date  date NOT NULL,
  end_date    date,
  next_due    date,
  note        text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_recurring_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_budgets (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id    uuid REFERENCES public.pp_categories(id) ON DELETE SET NULL,
  month          text NOT NULL,
  planned_amount numeric NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),
  currency       text NOT NULL DEFAULT 'THB',
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_budgets_pkey PRIMARY KEY (id),
  CONSTRAINT pp_budgets_user_id_month_category_id_key UNIQUE (user_id, month, category_id)
);

CREATE TABLE public.pp_assets (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  type                 text NOT NULL,
  full_name            text,
  sector               text,
  currency             text NOT NULL DEFAULT 'THB',
  current_price        numeric DEFAULT 0,
  last_price_updated_at timestamptz,
  logo_url             text,
  data_source          text,
  sub_portfolio        text DEFAULT 'Main Portfolio',
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_assets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_asset_lots (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id     uuid NOT NULL REFERENCES public.pp_assets(id) ON DELETE CASCADE,
  qty          numeric NOT NULL,
  cost_per_unit numeric NOT NULL,
  occurred_on  date NOT NULL DEFAULT CURRENT_DATE,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_asset_lots_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_asset_price_history (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id    uuid NOT NULL REFERENCES public.pp_assets(id) ON DELETE CASCADE,
  price       numeric NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_asset_price_history_pkey PRIMARY KEY (id),
  CONSTRAINT pp_asset_price_history_asset_id_recorded_at_key UNIQUE (asset_id, recorded_at)
);

CREATE TABLE public.pp_simulations (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  config     jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_simulations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_people (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  nickname   text,
  color      text DEFAULT '#6366f1',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_people_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_splits (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.pp_transactions(id) ON DELETE CASCADE,
  due_date       date,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_splits_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pp_split_participants (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  split_id      uuid NOT NULL REFERENCES public.pp_splits(id) ON DELETE CASCADE,
  person_id     uuid REFERENCES public.pp_people(id) ON DELETE SET NULL,
  mode          public.pp_split_mode NOT NULL DEFAULT 'amount',
  value         numeric NOT NULL,
  actual_amount numeric NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_split_participants_pkey PRIMARY KEY (id),
  CONSTRAINT pp_split_participants_split_id_person_id_key UNIQUE (split_id, person_id)
);

CREATE TABLE public.pp_split_payments (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_id   uuid NOT NULL REFERENCES public.pp_splits(id) ON DELETE CASCADE,
  person_id  uuid REFERENCES public.pp_people(id) ON DELETE SET NULL,
  amount     numeric NOT NULL CHECK (amount > 0),
  paid_on    date NOT NULL DEFAULT CURRENT_DATE,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pp_split_payments_pkey PRIMARY KEY (id)
);

-- ─── Shared / CMS Tables ─────────────────────────────────────────────────────

CREATE TABLE public.pp_market_cache (
  symbol     text NOT NULL,
  price      numeric NOT NULL,
  name       text,
  logo_url   text,
  source     text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pp_market_cache_pkey PRIMARY KEY (symbol)
);

CREATE TABLE public.pp_site_content (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  section    text NOT NULL,
  key        text NOT NULL,
  value_en   text,
  value_th   text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pp_site_content_pkey PRIMARY KEY (id),
  CONSTRAINT pp_site_content_section_key_key UNIQUE (section, key)
);
