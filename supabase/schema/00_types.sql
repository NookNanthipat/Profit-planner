-- ============================================================
-- 00_types.sql — Custom Enum Types
-- Project: ProfitPlanner (ydaogwwblzjmjsbadivv)
-- Last synced: 2026-04-30
-- ============================================================

-- Activity log event types
CREATE TYPE public.activity_type AS ENUM (
  'signup',
  'login',
  'purchase',
  'trial_started',
  'entitlement_granted',
  'entitlement_revoked',
  'product_status_changed'
);

-- User role types (admin | user)
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'user'
);

-- Product entitlement statuses
CREATE TYPE public.entitlement_status AS ENUM (
  'active',
  'inactive',
  'trial',
  'expired'
);

-- ProfitPlanner account types
CREATE TYPE public.pp_account_type AS ENUM (
  'cash',
  'bank',
  'credit',
  'ewallet'
);

-- Split payment calculation mode
CREATE TYPE public.pp_split_mode AS ENUM (
  'amount',
  'percent'
);

-- Transaction type (income / expense)
CREATE TYPE public.pp_tx_type AS ENUM (
  'income',
  'expense'
);
