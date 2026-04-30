-- ============================================================
-- P1-C: แก้ delete_user_data_and_account และ reset_user_financial_data
--
-- บัคที่แก้:
--   1. profiles ลบด้วย WHERE user_id = uid (เดิมใช้ id = uid ผิด)
--   2. ลำดับการลบตาม FK dependencies (leaf → root)
--   3. เพิ่ม pp_budgets ที่หายไป
--   4. เพิ่ม pp_asset_lots ที่หายไป
--   5. NULL parent_id ก่อนลบ pp_categories (self-referential FK)
--
-- รัน: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ============================================================
-- FUNCTION 1: delete_user_data_and_account
-- ลบข้อมูลทั้งหมดและบัญชีของ user ที่เรียกใช้ (PDPA Right to Erasure)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_data_and_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- ─── STEP 1: Split payment tables (leaf — อ้างถึง pp_splits, pp_people) ───
  DELETE FROM public.pp_split_participants
    WHERE split_id IN (
      SELECT id FROM public.pp_splits WHERE user_id = uid
    );

  DELETE FROM public.pp_split_payments
    WHERE user_id = uid;

  -- ─── STEP 2: Splits (อ้างถึง pp_transactions) ─────────────────────────────
  DELETE FROM public.pp_splits
    WHERE user_id = uid;

  -- ─── STEP 3: Transactions (อ้างถึง pp_accounts, pp_categories, pp_debts) ──
  DELETE FROM public.pp_transactions
    WHERE user_id = uid;

  -- ─── STEP 4: Financial structure ──────────────────────────────────────────
  DELETE FROM public.pp_debts
    WHERE user_id = uid;

  DELETE FROM public.pp_recurring
    WHERE user_id = uid;

  DELETE FROM public.pp_budgets        -- เพิ่มใหม่ (เดิมหายไป)
    WHERE user_id = uid;

  DELETE FROM public.pp_accounts
    WHERE user_id = uid;

  -- pp_categories มี self-referential FK (parent_id → id)
  -- ต้อง NULL ออกก่อนเพื่อป้องกัน FK violation
  UPDATE public.pp_categories
    SET parent_id = NULL
    WHERE user_id = uid;

  DELETE FROM public.pp_categories
    WHERE user_id = uid;

  -- ─── STEP 5: Assets ───────────────────────────────────────────────────────
  DELETE FROM public.pp_asset_lots     -- เพิ่มใหม่ (เดิมหายไป)
    WHERE user_id = uid;

  DELETE FROM public.pp_asset_price_history
    WHERE user_id = uid;

  DELETE FROM public.pp_assets
    WHERE user_id = uid;

  -- ─── STEP 6: ตารางที่เหลือ ────────────────────────────────────────────────
  DELETE FROM public.pp_simulations
    WHERE user_id = uid;

  DELETE FROM public.pp_people
    WHERE user_id = uid;

  -- ─── STEP 7: Entitlements & roles ─────────────────────────────────────────
  DELETE FROM public.user_roles
    WHERE user_id = uid;

  DELETE FROM public.user_products
    WHERE user_id = uid;

  -- ─── STEP 8: Profile (แก้บัค: เดิมใช้ id = uid ผิด) ─────────────────────
  DELETE FROM public.profiles
    WHERE user_id = uid;          -- แก้จาก: WHERE id = uid

  -- ─── STEP 9: Auth user (สุดท้ายเสมอ) ────────────────────────────────────
  DELETE FROM auth.users
    WHERE id = uid;

END;
$$;


-- ============================================================
-- FUNCTION 2: reset_user_financial_data
-- ลบเฉพาะข้อมูลการเงิน — บัญชีและสิทธิ์ยังคงอยู่
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_user_financial_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- ─── STEP 1: Split payment tables ─────────────────────────────────────────
  DELETE FROM public.pp_split_participants
    WHERE split_id IN (
      SELECT id FROM public.pp_splits WHERE user_id = uid
    );

  DELETE FROM public.pp_split_payments
    WHERE user_id = uid;

  -- ─── STEP 2: Splits ────────────────────────────────────────────────────────
  DELETE FROM public.pp_splits
    WHERE user_id = uid;

  -- ─── STEP 3: Transactions ─────────────────────────────────────────────────
  DELETE FROM public.pp_transactions
    WHERE user_id = uid;

  -- ─── STEP 4: Financial structure ──────────────────────────────────────────
  DELETE FROM public.pp_debts
    WHERE user_id = uid;

  DELETE FROM public.pp_recurring
    WHERE user_id = uid;

  DELETE FROM public.pp_budgets        -- เพิ่มใหม่ (เดิมหายไป)
    WHERE user_id = uid;

  DELETE FROM public.pp_accounts
    WHERE user_id = uid;

  UPDATE public.pp_categories
    SET parent_id = NULL
    WHERE user_id = uid;

  DELETE FROM public.pp_categories
    WHERE user_id = uid;

  -- ─── STEP 5: Assets ────────────────────────────────────────────────────────
  DELETE FROM public.pp_asset_lots     -- เพิ่มใหม่ (เดิมหายไป)
    WHERE user_id = uid;

  DELETE FROM public.pp_asset_price_history
    WHERE user_id = uid;

  DELETE FROM public.pp_assets
    WHERE user_id = uid;

  -- ─── STEP 6: ตารางที่เหลือ ────────────────────────────────────────────────
  DELETE FROM public.pp_simulations
    WHERE user_id = uid;

  -- หมายเหตุ: pp_people ไม่ลบใน reset (ไว้ใช้ split ครั้งต่อไป)
  -- หากต้องการลบด้วย ให้ uncomment บรรทัดนี้:
  -- DELETE FROM public.pp_people WHERE user_id = uid;

END;
$$;


-- ============================================================
-- VERIFICATION: ตรวจสอบว่า functions ถูก replace แล้ว
-- ============================================================
SELECT
  routine_name,
  routine_definition IS NOT NULL AS has_body,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'delete_user_data_and_account',
    'reset_user_financial_data'
  );
