-- ============================================================
-- Fix: Allow users to insert their own consent record
-- จำเป็นสำหรับ Google OAuth signup — consent บันทึกจาก client หลัง OAuth callback
-- รัน: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE POLICY "Users insert own consent" ON public.consent_records
  FOR INSERT WITH CHECK (user_id = auth.uid());
