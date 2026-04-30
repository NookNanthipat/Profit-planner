-- ============================================================
-- 03_rls.sql — Row Level Security Policies (ทุกตาราง)
-- Project: ProfitPlanner (ydaogwwblzjmjsbadivv)
-- Last synced: 2026-04-30
-- หมายเหตุ: ⚠️ = policy ที่ต้องระวัง
-- ============================================================

-- ─── activity_log ────────────────────────────────────────────────────────────
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- admin อ่านได้ทั้งหมด (user ทั่วไปอ่านไม่ได้)
CREATE POLICY "Admins read activity" ON public.activity_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- user INSERT log ของตัวเองได้ (หรือ admin)
CREATE POLICY "Users insert own activity" ON public.activity_log
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ─── pp_accounts ─────────────────────────────────────────────────────────────
ALTER TABLE public.pp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_accounts owner select" ON public.pp_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_accounts owner insert" ON public.pp_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_accounts owner update" ON public.pp_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pp_accounts owner delete" ON public.pp_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ─── pp_asset_lots ───────────────────────────────────────────────────────────
ALTER TABLE public.pp_asset_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_asset_lots owner select" ON public.pp_asset_lots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_asset_lots owner insert" ON public.pp_asset_lots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_asset_lots owner update" ON public.pp_asset_lots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pp_asset_lots owner delete" ON public.pp_asset_lots
  FOR DELETE USING (auth.uid() = user_id);

-- ─── pp_assets ───────────────────────────────────────────────────────────────
ALTER TABLE public.pp_assets ENABLE ROW LEVEL SECURITY;

-- ⚠️ มี policy ซ้ำซ้อน (owner_access_assets + 4 individual policies)
-- owner_access_assets ครอบคลุมทั้งหมดอยู่แล้ว — ควร cleanup ในอนาคต
CREATE POLICY "owner_access_assets" ON public.pp_assets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner select" ON public.pp_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner insert" ON public.pp_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update" ON public.pp_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner delete" ON public.pp_assets FOR DELETE USING (auth.uid() = user_id);

-- ─── pp_budgets ──────────────────────────────────────────────────────────────
ALTER TABLE public.pp_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budgets" ON public.pp_budgets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── pp_categories ───────────────────────────────────────────────────────────
ALTER TABLE public.pp_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_categories owner select" ON public.pp_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_categories owner insert" ON public.pp_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_categories owner update" ON public.pp_categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pp_categories owner delete" ON public.pp_categories
  FOR DELETE USING (auth.uid() = user_id);

-- ─── pp_debts ────────────────────────────────────────────────────────────────
ALTER TABLE public.pp_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own debts" ON public.pp_debts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── pp_market_cache ─────────────────────────────────────────────────────────
ALTER TABLE public.pp_market_cache ENABLE ROW LEVEL SECURITY;

-- ทุกคนอ่านได้ (ข้อมูลราคาตลาด ไม่ใช่ข้อมูลส่วนตัว)
CREATE POLICY "Anyone can view cache" ON public.pp_market_cache
  FOR SELECT USING (true);

-- ⚠️ user ที่ authenticated ทั้งหมด UPDATE ได้ — ควร restrict เป็น service_role เท่านั้น
CREATE POLICY "Users can update cache" ON public.pp_market_cache
  FOR ALL USING (auth.role() = 'authenticated');

-- ─── pp_people ───────────────────────────────────────────────────────────────
ALTER TABLE public.pp_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_people owner select" ON public.pp_people
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_people owner insert" ON public.pp_people
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_people owner update" ON public.pp_people
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pp_people owner delete" ON public.pp_people
  FOR DELETE USING (auth.uid() = user_id);

-- ─── pp_recurring ────────────────────────────────────────────────────────────
ALTER TABLE public.pp_recurring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring" ON public.pp_recurring
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── pp_simulations ──────────────────────────────────────────────────────────
ALTER TABLE public.pp_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access_sim" ON public.pp_simulations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── pp_site_content ─────────────────────────────────────────────────────────
ALTER TABLE public.pp_site_content ENABLE ROW LEVEL SECURITY;

-- ทุกคนอ่านได้ (เนื้อหา CMS สาธารณะ)
CREATE POLICY "Public view site content" ON public.pp_site_content
  FOR SELECT USING (true);

-- เฉพาะ admin แก้ไขได้
CREATE POLICY "Admins manage site content" ON public.pp_site_content
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ─── pp_split_participants ───────────────────────────────────────────────────
ALTER TABLE public.pp_split_participants ENABLE ROW LEVEL SECURITY;

-- เข้าถึงได้เฉพาะ user ที่เป็นเจ้าของ pp_splits ที่เชื่อมอยู่
CREATE POLICY "pp_split_participants owner select" ON public.pp_split_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pp_splits WHERE pp_splits.id = split_id AND pp_splits.user_id = auth.uid())
  );
CREATE POLICY "pp_split_participants owner insert" ON public.pp_split_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pp_splits WHERE pp_splits.id = split_id AND pp_splits.user_id = auth.uid())
  );
CREATE POLICY "pp_split_participants owner update" ON public.pp_split_participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM pp_splits WHERE pp_splits.id = split_id AND pp_splits.user_id = auth.uid())
  );
CREATE POLICY "pp_split_participants owner delete" ON public.pp_split_participants
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM pp_splits WHERE pp_splits.id = split_id AND pp_splits.user_id = auth.uid())
  );

-- ─── pp_split_payments ───────────────────────────────────────────────────────
ALTER TABLE public.pp_split_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_split_payments owner select" ON public.pp_split_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_split_payments owner insert" ON public.pp_split_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_split_payments owner update" ON public.pp_split_payments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pp_split_payments owner delete" ON public.pp_split_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ─── pp_splits ───────────────────────────────────────────────────────────────
ALTER TABLE public.pp_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_splits owner select" ON public.pp_splits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_splits owner insert" ON public.pp_splits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_splits owner update" ON public.pp_splits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pp_splits owner delete" ON public.pp_splits
  FOR DELETE USING (auth.uid() = user_id);

-- ─── pp_transactions ─────────────────────────────────────────────────────────
ALTER TABLE public.pp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_tx owner select" ON public.pp_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pp_tx owner insert" ON public.pp_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_tx owner update" ON public.pp_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pp_tx owner delete" ON public.pp_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ─── products ────────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ทุกคนเห็น products ที่ active (admin เห็นทั้งหมด)
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage products" ON public.products
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─── profiles ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── user_products ───────────────────────────────────────────────────────────
-- ✅ Fixed 2026-04-30: ลบ INSERT/UPDATE policies ออก (ป้องกัน self-grant exploit)
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own entitlements" ON public.user_products
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage entitlements" ON public.user_products
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─── user_roles ──────────────────────────────────────────────────────────────
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
