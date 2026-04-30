# Supabase Changelog
**Project:** ProfitPlanner (`ydaogwwblzjmjsbadivv`)

---

## วิธีบันทึก Log

เมื่อมีการเปลี่ยนแปลง schema, function, หรือ RLS ให้เพิ่มรายการใหม่ที่ด้านบนสุด โดยใช้รูปแบบ:

```
## [YYYY-MM-DD] ชื่อการเปลี่ยนแปลง
**ประเภท:** schema | function | rls | index | edge-function
**ไฟล์ที่อัปเดต:** supabase/schema/xx_file.sql

### เปลี่ยนแปลง
- รายละเอียด

### เหตุผล
- ทำไมถึงเปลี่ยน

### SQL ที่รัน
\`\`\`sql
-- SQL ที่ใช้จริง
\`\`\`
```

---

## [2026-05-01] Phase 3: Security Hardening

**ประเภท:** schema, rls, config, frontend  
**ไฟล์:** หลายไฟล์ (ดูรายการ)

### เปลี่ยนแปลง
- **P3-A** เพิ่ม dismissible financial disclaimer ใน `Simulator.tsx` และ `Portfolio.tsx`
- **P3-B** เพิ่ม password minimum length จาก 6 → 8 ใน `Auth.tsx`
- **P3-C** สร้าง `netlify.toml` และ `vercel.json` พร้อม security headers (HSTS, CSP, X-Frame-Options, etc.)
- **P3-D** สร้างหน้า `RefundPolicy.tsx` + route `/refund` ใน App.tsx
- **P3-E** ลบ "(Example)" จาก ToS contact email
- **P3-F** สร้าง `sql_phase3F_market_cache_rls.sql` สำหรับล็อก pp_market_cache

### เหตุผล
- PDPA + พ.ร.บ.หลักทรัพย์: Simulator/Portfolio ต้องแสดงว่าไม่ใช่คำแนะนำลงทุน
- NIST/OWASP: password min 8
- Security headers: ป้องกัน clickjacking, MIME sniffing, XSS
- พ.ร.บ.คุ้มครองผู้บริโภค: ต้องมี Refund Policy ชัดเจน

---

## [2026-05-01] Phase 2-A: PDPA Consent Records

**ประเภท:** schema, function  
**ไฟล์:** `supabase/schema/05_consent.sql`, `sql_phase2A_consent.sql`

### เปลี่ยนแปลง
- สร้างตาราง `consent_records` สำหรับบันทึก PDPA consent ทุกครั้งที่ user สมัคร
- อัปเดต trigger `handle_new_user` ให้อ่าน `raw_user_meta_data` และ INSERT เข้า consent_records อัตโนมัติ
- อัปเดต `src/pages/Auth.tsx`: แยก checkbox เป็น 3 ตัว (ToS required, Privacy required, Marketing optional)
- ส่ง consent metadata ทั้งหมดผ่าน `supabase.auth.signUp({ options: { data: {...} } })`

### เหตุผล
- PDPA Section 19: ต้องมีหลักฐานการขอ consent (consent_records)
- PDPA Section 26: ต้องแยก consent ตามวัตถุประสงค์ (ToS ≠ Privacy ≠ Marketing)
- consent_records ไม่อนุญาต UPDATE/DELETE เพื่อรักษา audit trail

### SQL ที่รัน
```sql
-- ดู sql_phase2A_consent.sql สำหรับ SQL เต็ม
CREATE TABLE IF NOT EXISTS public.consent_records (...);
CREATE OR REPLACE FUNCTION public.handle_new_user() ...
```

---

## [2026-04-30] Deploy Edge Function: grant-product-access

**ประเภท:** edge-function  
**ไฟล์:** `supabase/functions/grant-product-access/index.ts`

### เปลี่ยนแปลง
- Deploy Edge Function `grant-product-access` เพื่อจัดการ product entitlement แบบ server-side
- แก้ `src/pages/Checkout.tsx` ให้เรียก Edge Function แทนการเขียน `user_products` จาก client โดยตรง

### เหตุผล
- ปิดช่องโหว่ที่ผู้ใช้สามารถ grant ตัวเองได้ฟรีผ่าน browser console (P1-B Security Fix)
- รองรับ mode: `demo` | `trial` | `stripe`

### Env Secrets ที่ตั้ง
- `DEMO_MODE=true` (ลบออกก่อน production)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)

---

## [2026-04-30] Fix: delete_user_data_and_account + reset_user_financial_data

**ประเภท:** function  
**ไฟล์:** `supabase/schema/04_functions.sql`, `sql_fix_P1C_delete_functions.sql`

### เปลี่ยนแปลง
1. แก้ `profiles` deletion: `WHERE id = uid` → `WHERE user_id = uid`
2. แก้ลำดับการลบตาม FK dependencies (leaf → root) ป้องกัน FK violation
3. เพิ่ม `pp_budgets` ที่หายไปจากทั้งสอง functions
4. เพิ่ม `pp_asset_lots` ที่หายไปจากทั้งสอง functions
5. เพิ่ม `UPDATE pp_categories SET parent_id = NULL` ก่อน DELETE (self-referential FK)

### เหตุผล
- Bug fix สำหรับ PDPA Right to Erasure (P1-C Security Fix)
- ข้อมูลบางส่วนค้างในระบบหลังขอลบบัญชี

### SQL ที่รัน
```sql
-- ดู sql_fix_P1C_delete_functions.sql สำหรับ SQL เต็ม
CREATE OR REPLACE FUNCTION public.delete_user_data_and_account() ...
CREATE OR REPLACE FUNCTION public.reset_user_financial_data() ...
```

---

## [2026-04-30] Fix: ลบ INSERT/UPDATE RLS policies บน user_products

**ประเภท:** rls  
**ไฟล์:** `supabase/schema/03_rls.sql`, `sql_fix_P1A_rls_user_products.sql`

### เปลี่ยนแปลง
- ลบ policy `"Users can create own entitlement"` (INSERT) ออก
- ลบ policy `"Users can update own entitlement"` (UPDATE) ออก
- เหลือแค่ SELECT (owner) + ALL (admin)

### เหตุผล
- ปิดช่องโหว่ที่ผู้ใช้สามารถ `supabase.from("user_products").insert({status:"active"})` จาก browser console ได้ฟรี (P1-A Critical Security Fix)
- entitlement จะ grant ได้ผ่าน `grant-product-access` Edge Function เท่านั้น

### SQL ที่รัน
```sql
DROP POLICY IF EXISTS "Users can create own entitlement" ON public.user_products;
DROP POLICY IF EXISTS "Users can update own entitlement" ON public.user_products;
```

---

## [2026-04-29] Initial Schema Documentation

**ประเภท:** schema  
**ไฟล์:** `sql_supabase290426.txt`, `supabase/schema/`

### เปลี่ยนแปลง
- บันทึก schema เริ่มต้นทั้งหมด 21 ตาราง
- บันทึก 6 enum types, 18 functions, RLS policies ทั้งหมด, 22 indexes
- สร้าง SCHEMA_OVERVIEW.md และ RELATIONSHIPS.md

---

## Template สำหรับรายการถัดไป

```
## [YYYY-MM-DD] ชื่อการเปลี่ยนแปลง

**ประเภท:** schema | function | rls | index | edge-function
**ไฟล์:** supabase/schema/xx_file.sql

### เปลี่ยนแปลง
-

### เหตุผล
-

### SQL ที่รัน
\`\`\`sql

\`\`\`
```
