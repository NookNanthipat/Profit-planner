# Security & Legal Audit — ProfitPlanner
**วันที่ตรวจสอบ:** 29 เมษายน 2026  
**ตรวจสอบโดย:** Claude Code (Sonnet 4.6)  
**ขอบเขต:** Codebase + Supabase Schema + RLS Policies + RPC Functions

---

## สรุปผล Executive Summary

| ระดับ | จำนวนปัญหา | สถานะ |
|---|---|---|
| 🔴 วิกฤต (ต้องแก้ก่อน launch) | 3 | ยังไม่แก้ |
| 🟡 สำคัญ (PDPA Compliance) | 3 | ยังไม่แก้ |
| 🟢 ควรทำ (Security Hardening) | 5 | ยังไม่แก้ |

---

## Part 1 — ผลการตรวจสอบ (Findings)

---

### 🔴 CRITICAL-1: RLS บน `user_products` เปิดช่องให้ใช้งานฟรีได้

**ที่มา:** Supabase RLS Policies บนตาราง `user_products`

**Policy ที่มีปัญหา:**
- `"Users can create own entitlement"` → INSERT (อันตราย)
- `"Users can update own entitlement"` → UPDATE (อันตราย)

**ผลกระทบ:** ผู้ใช้ที่ login แล้วสามารถเปิด browser console แล้วรันคำสั่ง:
```javascript
await supabase.from("user_products").insert({
  user_id: "their_own_id",
  product_id: "any_product_id",
  status: "active"
})
// → ได้สิทธิ์ Pro ฟรีทันที โดยไม่ต้องจ่ายเงิน
```

**Root Cause:** `Checkout.tsx` เขียน `user_products` จาก client โดยตรง (บรรทัด 32-47) ทำให้ต้องเปิด INSERT policy ไว้ ซึ่งเป็นการออกแบบที่ไม่ปลอดภัย

---

### 🔴 CRITICAL-2: `delete_user_data_and_account` มีบัค 4 จุด

**ที่มา:** SQL function `public.delete_user_data_and_account()`

#### บัค 2.1 — `profiles` ถูกลบด้วย condition ผิด
```sql
-- ❌ ผิด: profiles.id เป็น UUID ของตัวเอง ไม่ใช่ user_id
DELETE FROM public.profiles WHERE id = uid;

-- ✅ ถูก
DELETE FROM public.profiles WHERE user_id = uid;
```
**ผลกระทบ:** Profile (ชื่อ, email) ของ user ไม่ถูกลบเลยหลังขอลบบัญชี → **ละเมิด PDPA Right to Erasure**

#### บัค 2.2 — ลำดับการลบผิด → FK Violation
```sql
-- ❌ ลบ pp_transactions ก่อน ทั้งที่ pp_splits มี FK ชี้มา (ไม่มี CASCADE)
DELETE FROM public.pp_transactions WHERE user_id = uid;  -- บรรทัดที่ 1
...
DELETE FROM public.pp_splits WHERE user_id = uid;        -- บรรทัดที่ 10
```
**ผลกระทบ:** ถ้า user มี split payment ที่ผูกกับ transaction → function จะ error และไม่ลบข้อมูลอะไรเลย

#### บัค 2.3 — `pp_budgets` ไม่ถูกลบ
```sql
-- ❌ ไม่มีบรรทัดนี้ในทั้งสอง function
DELETE FROM public.pp_budgets WHERE user_id = uid;
```
**ผลกระทบ:** ข้อมูลงบประมาณค้างในระบบ → ละเมิด PDPA Right to Erasure

#### บัค 2.4 — `pp_asset_lots` ไม่ถูกลบ
```sql
-- ❌ ไม่มีเช่นกัน
DELETE FROM public.pp_asset_lots WHERE user_id = uid;
```

**หมายเหตุ:** `reset_user_financial_data()` มีบัคเดียวกันในข้อ 2.3 และ 2.4

---

### 🔴 CRITICAL-3: ไม่มีการบันทึก PDPA Consent

**ที่มา:** ตรวจ SQL schema ทั้งหมด

**สิ่งที่พบ:**
- มี checkbox "ยอมรับ ToS + Privacy Policy" ใน `Auth.tsx` (ดี)
- แต่ **ไม่มีตาราง `consent_records`** ในระบบเลย
- ไม่มีการบันทึก timestamp, version ของ policy, หรือ user agent ของการยินยอม
- Checkbox เดียวสำหรับ 2 เรื่อง (ToS + Privacy) = Bundled Consent ซึ่ง PDPA ไม่รับรองอย่างสมบูรณ์

**ความเสี่ยง:** หากถูกร้องเรียนต่อ PDPC ไม่สามารถพิสูจน์ได้ว่า user ให้ความยินยอมจริง

---

### 🟡 HIGH-1: Privacy Policy ไม่ครบตามกฎหมาย PDPA

**ที่มา:** `src/pages/PrivacyPolicy.tsx`

| หัวข้อที่ PDPA กำหนด | สถานะ |
|---|---|
| ชื่อ/ที่อยู่ Data Controller | ❌ ไม่มี |
| Data Processor (Supabase) + region | ❌ ไม่มี |
| ฐานทางกฎหมายของแต่ละวัตถุประสงค์ | ❌ ไม่มี |
| ระยะเวลาเก็บข้อมูล (Retention Period) | ❌ ไม่มี |
| Right to Portability | ❌ ไม่มี |
| Right to Restrict Processing | ❌ ไม่มี |
| Right to Object | ❌ ไม่มี |
| Right to Withdraw Consent | ❌ ไม่มี |
| วิธีร้องเรียนต่อ PDPC | ❌ ไม่มี |
| Right to Access | ✅ มี |
| Right to Rectification | ✅ มี |
| Right to Erasure | ✅ มี (แต่ implementation มีบัค) |
| อีเมลติดต่อ | ❌ เป็น "(Example)" |

---

### 🟡 HIGH-2: ไม่มีฟีเจอร์ Export ข้อมูล (Right to Portability)

**ที่มา:** ตรวจ `src/pages/Portal.tsx` และ codebase ทั้งหมด

PDPA มาตรา 37 กำหนดให้ผู้ควบคุมข้อมูลต้องสามารถส่งข้อมูลให้เจ้าของในรูปแบบที่เครื่องอ่านได้ (machine-readable) แต่ไม่มีปุ่ม Export ใดๆ ในระบบ

---

### 🟡 HIGH-3: คำเตือนการเงินอยู่แค่ใน ToS ไม่อยู่ใน App

**ที่มา:** `src/pages/TermsOfService.tsx`, `src/pages/app/profit-planner/Simulator.tsx`, `Portfolio.tsx`

Terms of Service มี Financial Disclaimer ที่ดี แต่ user ที่ใช้งาน Simulator หรือ Portfolio อาจไม่เคยอ่าน ToS → ความเสี่ยงถูกฟ้องว่าให้คำแนะนำการลงทุน (ต้องใบอนุญาต ก.ล.ต.)

---

### 🟢 MEDIUM-1: Password Minimum Length ต่ำเกินไป

**ที่มา:** `src/pages/Auth.tsx:155`
```tsx
<Input ... minLength={6} ... />
```
มาตรฐาน NIST และ OWASP แนะนำ minimum 8 ตัวอักษร

---

### 🟢 MEDIUM-2: Security Headers ไม่ได้ตั้งค่า

ควรมีที่ hosting layer:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`

---

### 🟢 MEDIUM-3: ไม่มี Refund Policy ที่ชัดเจน

**ที่มา:** `src/pages/Checkout.tsx:100`

Checkout แสดง "30-day money-back" แต่ไม่มีหน้า Refund Policy → ความเสี่ยงตาม พ.ร.บ. คุ้มครองผู้บริโภค

---

### 🟢 MEDIUM-4: อีเมลติดต่อใน ToS เป็น Example

**ที่มา:** `src/pages/TermsOfService.tsx`
```
Contact: support@profitplanner.app (Example)
```
ต้องเปลี่ยนเป็นอีเมลจริงก่อนเปิดตัว

---

### 🟢 MEDIUM-5: `pp_market_cache` — ต้องตรวจ RLS

ตารางนี้ไม่มี `user_id` (shared cache) — ต้องยืนยันว่า user ทั่วไป INSERT/UPDATE ไม่ได้ มีแค่ service_role เท่านั้น

---

## Part 2 — แผนการแก้ไข (Remediation Plan)

---

### Phase 1 — วิกฤต: ต้องทำก่อน Production Launch

#### P1-A: ล็อก RLS `user_products`

**วิธีทำ:** รัน SQL ใน Supabase SQL Editor

```sql
-- ลบ policies ที่อันตราย
DROP POLICY IF EXISTS "Users can create own entitlement" ON public.user_products;
DROP POLICY IF EXISTS "Users can update own entitlement" ON public.user_products;

-- ยืนยัน policies ที่เหลือ (ควรเหลือแค่ 2 นี้)
-- 1. "Admins manage entitlements" — ALL for admin role
-- 2. "Users view own entitlements" — SELECT WHERE user_id = auth.uid()
```

**ไฟล์ที่ต้องแก้ร่วม:** `src/pages/Checkout.tsx` (ดู P1-B)

---

#### P1-B: ย้าย Checkout Logic ไป Server-Side

**Architecture ที่ถูกต้อง:**
```
Client (Checkout.tsx)
  → supabase.functions.invoke("grant-product-access", { productId, paymentRef })
  → Edge Function (ทำงานด้วย service_role)
      → ตรวจสอบ payment จาก Stripe / ตรวจสอบ admin approval
      → เขียน user_products ด้วย service_role
```

**Demo mode ระหว่างรอ Stripe:** ให้ Edge Function รับ `mode: "demo"` แล้ว grant ได้แค่ถ้า `DEMO_MODE=true` ใน env variable (ปิดได้ทันทีก่อน production)

---

#### P1-C: แก้ `delete_user_data_and_account` และ `reset_user_financial_data`

**ลำดับการลบที่ถูกต้อง (เรียงจาก leaf → root ตาม FK):**

```sql
CREATE OR REPLACE FUNCTION public.delete_user_data_and_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Leaf tables ก่อน (ไม่มีใครอ้างถึง)
  DELETE FROM public.pp_split_participants
    WHERE split_id IN (SELECT id FROM public.pp_splits WHERE user_id = uid);
  DELETE FROM public.pp_split_payments   WHERE user_id = uid;
  DELETE FROM public.pp_splits           WHERE user_id = uid;

  -- Transactions (หลัง splits)
  DELETE FROM public.pp_transactions     WHERE user_id = uid;

  -- Financial structure
  DELETE FROM public.pp_debts            WHERE user_id = uid;
  DELETE FROM public.pp_recurring        WHERE user_id = uid;
  DELETE FROM public.pp_budgets          WHERE user_id = uid;  -- เพิ่มใหม่
  DELETE FROM public.pp_accounts         WHERE user_id = uid;
  DELETE FROM public.pp_categories       WHERE user_id = uid;

  -- Assets
  DELETE FROM public.pp_asset_lots       WHERE user_id = uid;  -- เพิ่มใหม่
  DELETE FROM public.pp_asset_price_history WHERE user_id = uid;
  DELETE FROM public.pp_assets           WHERE user_id = uid;

  -- Other
  DELETE FROM public.pp_simulations      WHERE user_id = uid;
  DELETE FROM public.pp_people           WHERE user_id = uid;

  -- Entitlements & roles
  DELETE FROM public.user_roles          WHERE user_id = uid;
  DELETE FROM public.user_products       WHERE user_id = uid;

  -- Consent & audit (ถ้ามีตารางแล้ว)
  -- DELETE FROM public.consent_records  WHERE user_id = uid;
  -- DELETE FROM public.activity_log     WHERE user_id = uid;

  -- Profile (แก้ bug: user_id ไม่ใช่ id)
  DELETE FROM public.profiles            WHERE user_id = uid;  -- แก้จาก id = uid

  -- Auth user สุดท้าย
  DELETE FROM auth.users WHERE id = uid;
END;
$$;
```

---

### Phase 2 — PDPA Compliance (ภายใน 2 สัปดาห์)

#### P2-A: สร้างตาราง `consent_records`

```sql
CREATE TABLE public.consent_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL DEFAULT '1.0',
  accepted_tos boolean NOT NULL DEFAULT false,
  accepted_privacy boolean NOT NULL DEFAULT false,
  accepted_marketing boolean NOT NULL DEFAULT false,
  consented_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own consent" ON public.consent_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own consent" ON public.consent_records
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

**แก้ `Auth.tsx`:**
- แยก checkbox เป็น 2 อัน: ToS และ Privacy Policy
- หลัง `signUp` สำเร็จ → INSERT ลง `consent_records` ทันที

---

#### P2-B: อัปเดต Privacy Policy

**ไฟล์:** `src/pages/PrivacyPolicy.tsx`

เพิ่มหัวข้อต่อไปนี้ (ต้องใช้ข้อมูลจริง):

| หัวข้อ | ข้อมูลที่ต้องใส่ |
|---|---|
| Data Controller | ชื่อ-นามสกุล/ชื่อบริษัท, ที่อยู่จริง, อีเมลจริง |
| Data Processor | "Supabase Inc., เซิร์ฟเวอร์ที่ [region ของ Supabase project]" |
| Legal Basis | Contract (ให้บริการ), Consent (marketing), Legitimate Interest (security) |
| Retention Period | เช่น "เก็บตลอดอายุบัญชี + 90 วันหลังลบ" |
| Right to Portability | "ขอ export ได้ที่ [อีเมลจริง] หรือผ่านปุ่ม Export ใน Portal" |
| Right to Restrict / Object | อธิบายวิธีการ |
| Right to Withdraw Consent | "ถอน consent ได้ผ่านปุ่ม Delete Account" |
| Right to Complain | "ร้องเรียนต่อ PDPC: www.pdpc.or.th หรือโทร 02-142-1033" |

---

#### P2-C: ปุ่ม Export ข้อมูล (Right to Portability)

**ไฟล์:** `src/pages/Portal.tsx`

เพิ่มปุ่ม "Export My Data" ที่ดึงข้อมูลจาก:
- `pp_transactions`, `pp_accounts`, `pp_categories`
- `pp_assets`, `pp_asset_lots`
- `pp_budgets`, `pp_recurring`, `pp_debts`
- `profiles`

แล้ว export เป็น JSON หรือ ZIP ของหลาย CSV

---

### Phase 3 — Security Hardening (ภายใน 1 เดือน)

| # | งาน | ไฟล์/ที่ | รายละเอียด |
|---|---|---|---|
| P3-A | Financial Disclaimer ใน UI | `Simulator.tsx`, `Portfolio.tsx` | เพิ่ม dismissible Alert "ไม่ใช่คำแนะนำการลงทุน" |
| P3-B | Password min 8 + require number | `Auth.tsx:155` | `minLength={8}` + client-side validation |
| P3-C | Security Headers | Hosting config | CSP, X-Frame-Options, HSTS |
| P3-D | Refund Policy page | `src/pages/RefundPolicy.tsx` | อธิบาย 30-day money-back conditions |
| P3-E | อีเมลจริงใน ToS + Privacy | `TermsOfService.tsx`, `PrivacyPolicy.tsx` | ลบคำว่า "(Example)" |
| P3-F | ตรวจ `pp_market_cache` RLS | Supabase Dashboard | ยืนยันว่า user INSERT ไม่ได้ |

---

## Part 3 — กฎหมายที่เกี่ยวข้องและกรณีที่ถูกฟ้องได้

### กฎหมายหลัก

| กฎหมาย | บังคับใช้ | โทษสูงสุด |
|---|---|---|
| PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล 2562) | ข้อมูลส่วนบุคคลทุกประเภท | ปรับ 5 ล้านบาท + อาญา 1 ปี |
| พ.ร.บ. คอมพิวเตอร์ 2550/2560 | ระบบคอมพิวเตอร์ | จำคุก 5 ปี + ปรับ 1 แสนบาท |
| พ.ร.บ. คุ้มครองผู้บริโภค 2522 | การขายสินค้า/บริการ | ปรับ 5 แสนบาท + จำคุก 5 ปี |
| พ.ร.บ. หลักทรัพย์ 2535 | คำแนะนำการลงทุน | ปรับ 5 ล้านบาท + จำคุก 5 ปี |

### กรณีที่ถูกฟ้องร้องได้

1. **PDPA — ไม่มี consent บันทึก:** ถูกร้องเรียนต่อ PDPC → ปรับทางแพ่ง
2. **PDPA — ข้อมูลไม่ถูกลบหลัง request:** (บัค profiles) → ปรับ 3 ล้านบาท
3. **PDPA — ข้อมูลรั่วไหลจาก RLS bug:** → ปรับ + อาจโดนฟ้องแพ่งเพิ่ม
4. **พ.ร.บ. หลักทรัพย์ — Simulator/Portfolio ถูกตีความว่าให้คำแนะนำลงทุน:** → ต้องใบอนุญาต ก.ล.ต.
5. **พ.ร.บ. ผู้บริโภค — ไม่คืนเงินตาม "30-day money-back" ที่โฆษณาไว้:** → ฟ้องได้
6. **ช่องโหว่ Checkout — revenue loss จาก self-grant:** → ไม่ถูกฟ้องแต่เสียรายได้จริง

---

## Checklist ก่อน Production Launch

```
🔴 Phase 1 — วิกฤต
[ ] P1-A: DROP INSERT/UPDATE policies บน user_products
[ ] P1-B: ย้าย grant logic ไป Edge Function
[ ] P1-C: แก้ delete_user_data_and_account (profiles bug + ลำดับ + pp_budgets + pp_asset_lots)
[ ] P1-C: แก้ reset_user_financial_data (pp_budgets + pp_asset_lots)

🟡 Phase 2 — PDPA
[ ] P2-A: สร้าง consent_records table + แก้ Auth.tsx signup flow
[ ] P2-B: อัปเดต Privacy Policy ให้ครบ (ใส่ข้อมูลจริง)
[ ] P2-C: เพิ่มปุ่ม Export Data ใน Portal

🟢 Phase 3 — Hardening
[ ] P3-A: Financial Disclaimer ใน Simulator + Portfolio
[ ] P3-B: Password min 8 ตัวอักษร
[ ] P3-C: Security Headers ที่ hosting
[ ] P3-D: หน้า Refund Policy
[ ] P3-E: อีเมลจริงใน ToS + Privacy
[ ] P3-F: ตรวจ pp_market_cache RLS
```

---

*เอกสารนี้จัดทำขึ้นเพื่อวัตถุประสงค์ในการปรับปรุงความปลอดภัยและการปฏิบัติตามกฎหมายของ ProfitPlanner เท่านั้น ไม่ใช่คำแนะนำทางกฎหมายอย่างเป็นทางการ — แนะนำให้ปรึกษาทนายความที่เชี่ยวชาญด้าน PDPA เพิ่มเติม*
