-- ============================================================
-- P1-A: Lock RLS on user_products
-- ลบ INSERT / UPDATE policies ที่เปิดให้ user grant ตัวเองได้
--
-- รัน: Supabase Dashboard → SQL Editor → New Query
-- ผล: user ทั่วไป SELECT ได้อย่างเดียว
--     admin ยังทำได้ทุกอย่างตาม "Admins manage entitlements"
-- ============================================================

-- Step 1: ลบ policies ที่อันตราย
DROP POLICY IF EXISTS "Users can create own entitlement" ON public.user_products;
DROP POLICY IF EXISTS "Users can update own entitlement" ON public.user_products;

-- Step 2: ตรวจสอบว่า policies ที่เหลือถูกต้อง
-- ควรเห็นแค่ 2 rows หลังรัน query นี้:
--   1. Admins manage entitlements  (command = ALL)
--   2. Users view own entitlements (command = SELECT)
SELECT
  policyname,
  cmd AS command,
  qual AS using_expr,
  with_check
FROM pg_policies
WHERE tablename = 'user_products'
ORDER BY policyname;
