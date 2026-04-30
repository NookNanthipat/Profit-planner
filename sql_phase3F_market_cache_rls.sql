-- ============================================================
-- Phase 3-F: ตรวจและล็อก RLS บน pp_market_cache
-- รัน: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── STEP 1: ดู policies ปัจจุบัน ──────────────────────────────────────────
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'pp_market_cache';

-- ─── STEP 2: ลบ policy ที่ให้ authenticated user เขียนได้ ─────────────────
-- ชื่อ policy อาจต่างกัน ให้ดูจากผล STEP 1 แล้วปรับชื่อตามจริง
DROP POLICY IF EXISTS "Authenticated users can update market cache" ON public.pp_market_cache;
DROP POLICY IF EXISTS "Authenticated users can insert market cache" ON public.pp_market_cache;
DROP POLICY IF EXISTS "auth_write_market_cache" ON public.pp_market_cache;

-- ─── STEP 3: ตั้ง policy ที่ถูกต้อง ────────────────────────────────────────
-- อ่านได้: ทุกคน (รวม unauthenticated สำหรับ market data)
-- เขียนได้: service_role เท่านั้น (ผ่าน Edge Function)

-- Public read (ถ้ายังไม่มี)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pp_market_cache' AND policyname = 'Public read market cache'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read market cache" ON public.pp_market_cache
      FOR SELECT USING (true)';
  END IF;
END $$;

-- service_role เท่านั้นที่ INSERT/UPDATE/DELETE ได้
-- (service_role bypasses RLS โดย default — ไม่ต้องสร้าง policy เพิ่ม
--  แค่ลบ policy ที่เปิดให้ authenticated user เขียนออกก็เพียงพอ)

-- ─── STEP 4: ยืนยันผล ────────────────────────────────────────────────────────
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'pp_market_cache'
ORDER BY policyname;

-- ผลที่คาดหวัง: เหลือแค่ SELECT policy เท่านั้น
-- INSERT/UPDATE ใน Edge Function ใช้ service_role key (bypass RLS อัตโนมัติ)
