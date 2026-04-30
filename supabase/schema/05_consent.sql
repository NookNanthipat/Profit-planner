-- ============================================================
-- 05_consent.sql — PDPA Consent Records
-- Added: Phase 2-A (2026-05-01)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consent_records (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version     text        NOT NULL DEFAULT '1.0',
  accepted_tos       boolean     NOT NULL DEFAULT false,
  accepted_privacy   boolean     NOT NULL DEFAULT false,
  accepted_marketing boolean     NOT NULL DEFAULT false,
  consented_at       timestamptz NOT NULL DEFAULT now(),
  user_agent         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_records_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS consent_records_user_idx
  ON public.consent_records USING btree (user_id, created_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own consent" ON public.consent_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins read all consent" ON public.consent_records
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger function updated to record consent on new user signup
-- (see 04_functions.sql handle_new_user — updated in Phase 2-A)
