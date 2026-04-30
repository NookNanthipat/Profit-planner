-- ============================================================
-- 02_indexes.sql — All Non-Primary Indexes
-- Project: ProfitPlanner (ydaogwwblzjmjsbadivv)
-- Last synced: 2026-04-30
-- ============================================================

-- ─── activity_log ────────────────────────────────────────────────────────────
CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);
CREATE INDEX idx_activity_log_type       ON public.activity_log USING btree (type);

-- ─── pp_accounts ─────────────────────────────────────────────────────────────
CREATE INDEX pp_accounts_user_idx ON public.pp_accounts USING btree (user_id);

-- ─── pp_asset_price_history ──────────────────────────────────────────────────
-- UNIQUE: ราคาต่อวันต่อ asset
CREATE UNIQUE INDEX pp_asset_price_history_asset_id_recorded_at_key
  ON public.pp_asset_price_history USING btree (asset_id, recorded_at);

-- ─── pp_budgets ──────────────────────────────────────────────────────────────
-- UNIQUE: 1 budget ต่อ category ต่อเดือน ต่อ user
CREATE UNIQUE INDEX pp_budgets_user_id_month_category_id_key
  ON public.pp_budgets USING btree (user_id, month, category_id);
CREATE INDEX pp_budgets_user_month_idx
  ON public.pp_budgets USING btree (user_id, month);

-- ─── pp_categories ───────────────────────────────────────────────────────────
CREATE INDEX pp_categories_user_idx ON public.pp_categories USING btree (user_id);
CREATE INDEX pp_cat_parent_idx      ON public.pp_categories USING btree (user_id, parent_id);

-- ─── pp_debts ────────────────────────────────────────────────────────────────
CREATE INDEX pp_debts_user_idx ON public.pp_debts USING btree (user_id, is_active);

-- ─── pp_people ───────────────────────────────────────────────────────────────
CREATE INDEX pp_people_user_idx ON public.pp_people USING btree (user_id);

-- ─── pp_recurring ────────────────────────────────────────────────────────────
CREATE INDEX pp_recurring_user_idx ON public.pp_recurring USING btree (user_id, is_active);

-- ─── pp_site_content ─────────────────────────────────────────────────────────
CREATE UNIQUE INDEX pp_site_content_section_key_key
  ON public.pp_site_content USING btree (section, key);

-- ─── pp_split_participants ───────────────────────────────────────────────────
-- UNIQUE: 1 participant ต่อ split
CREATE UNIQUE INDEX pp_split_participants_split_id_person_id_key
  ON public.pp_split_participants USING btree (split_id, person_id);

-- ─── pp_split_payments ───────────────────────────────────────────────────────
CREATE INDEX pp_split_payments_user_idx ON public.pp_split_payments USING btree (user_id);

-- ─── pp_splits ───────────────────────────────────────────────────────────────
-- UNIQUE: 1 split ต่อ transaction
CREATE UNIQUE INDEX pp_splits_transaction_id_key
  ON public.pp_splits USING btree (transaction_id);
CREATE INDEX pp_splits_user_idx ON public.pp_splits USING btree (user_id);

-- ─── pp_transactions ─────────────────────────────────────────────────────────
-- Query หลัก: user + วันที่ DESC
CREATE INDEX pp_tx_user_date_idx ON public.pp_transactions USING btree (user_id, occurred_on DESC);
CREATE INDEX pp_tx_debt_idx      ON public.pp_transactions USING btree (debt_id);

-- ─── products ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

-- ─── user_products ───────────────────────────────────────────────────────────
-- UNIQUE: 1 entitlement ต่อ product ต่อ user (สำหรับ ON CONFLICT upsert)
CREATE UNIQUE INDEX user_products_user_id_product_id_key
  ON public.user_products USING btree (user_id, product_id);

-- ─── user_roles ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX user_roles_user_id_role_key
  ON public.user_roles USING btree (user_id, role);
