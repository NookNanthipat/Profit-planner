-- ============================================================
-- Phase 2-A: PDPA Consent Records
-- รัน: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── STEP 1: สร้างตาราง consent_records ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_records (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version   text NOT NULL DEFAULT '1.0',
  accepted_tos     boolean NOT NULL DEFAULT false,
  accepted_privacy boolean NOT NULL DEFAULT false,
  accepted_marketing boolean NOT NULL DEFAULT false,
  consented_at     timestamptz NOT NULL DEFAULT now(),
  user_agent       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_records_pkey PRIMARY KEY (id)
);

-- Index สำหรับ query ตาม user
CREATE INDEX IF NOT EXISTS consent_records_user_idx
  ON public.consent_records USING btree (user_id, created_at DESC);

-- RLS: user อ่านของตัวเองได้, admin อ่านได้ทั้งหมด, ไม่อนุญาต UPDATE/DELETE
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own consent" ON public.consent_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins read all consent" ON public.consent_records
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ─── STEP 2: อัปเดต handle_new_user trigger ──────────────────────────────────
-- เพิ่มการบันทึก consent จาก raw_user_meta_data ที่ส่งมาตอน signUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- สร้าง profile
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- บันทึก consent ถ้ามีข้อมูลใน metadata (email signup)
  IF (new.raw_user_meta_data->>'consent_tos') IS NOT NULL THEN
    INSERT INTO public.consent_records (
      user_id,
      policy_version,
      accepted_tos,
      accepted_privacy,
      accepted_marketing,
      user_agent
    ) VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'consent_version', '1.0'),
      COALESCE((new.raw_user_meta_data->>'consent_tos')::boolean,     false),
      COALESCE((new.raw_user_meta_data->>'consent_privacy')::boolean,  false),
      COALESCE((new.raw_user_meta_data->>'consent_marketing')::boolean, false),
      new.raw_user_meta_data->>'consent_user_agent'
    );
  END IF;

  RETURN new;
END;
$$;

-- ─── STEP 3: ตรวจสอบผล ────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'consent_records'
ORDER BY policyname;
