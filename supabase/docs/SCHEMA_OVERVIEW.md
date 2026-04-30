# Supabase Schema Overview
**Project:** ProfitPlanner (`ydaogwwblzjmjsbadivv`)  
**Last synced:** 2026-04-30

---

## ตารางทั้งหมด (21 ตาราง)

### Platform Tables (ระบบ auth และ entitlements)

| ตาราง | คำอธิบาย | RLS |
|---|---|---|
| `profiles` | ข้อมูลโปรไฟล์ user (display_name, avatar) สร้างอัตโนมัติจาก trigger | ✅ owner only |
| `user_roles` | กำหนด role ของ user (admin / user) | ✅ owner read, admin write |
| `products` | สินค้าในระบบ (ProfitPlanner, ฯลฯ) | ✅ public read active, admin write |
| `user_products` | entitlements — user ซื้อ/trial product ไหนบ้าง | ✅ owner read, admin ALL |
| `activity_log` | audit log ของ events สำคัญ (signup, purchase, etc.) | ✅ admin read, owner insert |

### ProfitPlanner App Tables (pp_*)

| ตาราง | คำอธิบาย | RLS |
|---|---|---|
| `pp_accounts` | บัญชีการเงิน (cash, bank, credit, ewallet) | ✅ owner CRUD |
| `pp_categories` | หมวดหมู่รายรับ/รายจ่าย (รองรับ parent-child) | ✅ owner CRUD |
| `pp_transactions` | รายการธุรกรรม ทุกรายรับ/รายจ่าย | ✅ owner CRUD |
| `pp_recurring` | รายการที่เกิดซ้ำ (subscription, เงินเดือน) | ✅ owner CRUD |
| `pp_budgets` | งบประมาณต่อหมวดหมู่ต่อเดือน | ✅ owner CRUD |
| `pp_debts` | ข้อมูลหนี้สิน (บัตรเครดิต, สินเชื่อ, จำนอง) | ✅ owner CRUD |
| `pp_assets` | สินทรัพย์ portfolio (หุ้น, กองทุน, crypto, etc.) | ✅ owner CRUD |
| `pp_asset_lots` | ล็อตการซื้อ asset (qty, cost_per_unit, วันที่) | ✅ owner CRUD |
| `pp_asset_price_history` | ประวัติราคา asset ต่อวัน (unique: asset+date) | ✅ owner CRUD |
| `pp_simulations` | การจำลองทางการเงิน (config เก็บเป็น jsonb) | ✅ owner CRUD |
| `pp_people` | รายชื่อบุคคลสำหรับ split payment | ✅ owner CRUD |
| `pp_splits` | การแชร์ค่าใช้จ่าย (1 split ต่อ transaction) | ✅ owner CRUD |
| `pp_split_participants` | ผู้เข้าร่วม split + สัดส่วน | ✅ owner ผ่าน pp_splits |
| `pp_split_payments` | การชำระเงินคืนของแต่ละคนใน split | ✅ owner CRUD |

### Shared / CMS Tables

| ตาราง | คำอธิบาย | RLS |
|---|---|---|
| `pp_market_cache` | cache ราคาตลาด (ไม่มี user_id) | ✅ public read, ⚠️ auth write |
| `pp_site_content` | เนื้อหา CMS แบบ key-value (EN/TH) | ✅ public read, admin write |

---

## Custom Enum Types (6 types)

| Type | Values |
|---|---|
| `activity_type` | signup, login, purchase, trial_started, entitlement_granted, entitlement_revoked, product_status_changed |
| `app_role` | admin, user |
| `entitlement_status` | active, inactive, trial, expired |
| `pp_account_type` | cash, bank, credit, ewallet |
| `pp_split_mode` | amount, percent |
| `pp_tx_type` | income, expense |

---

## Functions & RPCs (18 functions)

### Utility
| Function | Signature | คำอธิบาย |
|---|---|---|
| `has_role` | `(uuid, app_role) → bool` | ตรวจสอบ role ของ user |
| `user_has_product_access` | `(uuid, text) → bool` | ตรวจสอบสิทธิ์ใช้งาน product |

### ProfitPlanner RPCs
| Function | Signature | คำอธิบาย |
|---|---|---|
| `pp_monthly_summary` | `(uuid, date) → jsonb` | สรุปรายรับ/รายจ่าย/กราฟ ต่อเดือน |
| `pp_budget_summary` | `(uuid, text) → TABLE` | planned vs actual ต่อ category |
| `pp_next_due` | `(date, text, date) → date` | วันครบกำหนดถัดไปของ recurring |

### User Data Management
| Function | Signature | คำอธิบาย |
|---|---|---|
| `delete_user_data_and_account` | `() → void` | ลบข้อมูลทั้งหมด + auth user (PDPA) |
| `reset_user_financial_data` | `() → void` | ลบเฉพาะข้อมูลการเงิน เก็บบัญชีไว้ |

### Admin RPCs
| Function | Signature | คำอธิบาย |
|---|---|---|
| `admin_dashboard_metrics` | `() → jsonb` | metrics รวม (users, subs, signups) |
| `admin_list_users` | `() → TABLE` | รายชื่อ users ทั้งหมด |
| `admin_recent_activity` | `(int) → TABLE` | activity log ล่าสุด |
| `admin_grant_entitlement` | `(uuid, uuid, status, timestamptz) → uuid` | ให้สิทธิ์ product แก่ user |
| `admin_revoke_entitlement` | `(uuid) → void` | ถอนสิทธิ์ |
| `admin_set_role` | `(uuid, bool) → void` | set/unset admin role |
| `admin_user_entitlements` | `(uuid) → TABLE` | entitlements ของ user คนนั้น |
| `update_product_sort_order` | `(uuid[], int[]) → void` | เรียงลำดับ products |

### Trigger Functions
| Function | Trigger on | คำอธิบาย |
|---|---|---|
| `handle_new_user` | INSERT on `auth.users` | สร้าง profile อัตโนมัติ |
| `log_signup` | INSERT on `auth.users` | บันทึก signup ใน activity_log |
| `log_product_status_change` | UPDATE on `products` | บันทึกเมื่อ product เปลี่ยน status |

---

## ⚠️ Known Issues / TODO

| # | ปัญหา | ตาราง/Function | ความเร่งด่วน |
|---|---|---|---|
| 1 | `pp_market_cache` อนุญาตให้ `authenticated` user UPDATE ได้ทั้งหมด ควรเป็น service_role เท่านั้น | `pp_market_cache` RLS | Medium |
| 2 | `pp_assets` มี policy ซ้ำซ้อน (`owner_access_assets` + 4 individual policies) | `pp_assets` RLS | Low |
| 3 | ~~ยังไม่มี `consent_records` table สำหรับ PDPA compliance~~ | ✅ Done (Phase 2-A) | - |
| 4 | ~~ยังไม่มี data export endpoint สำหรับ PDPA Right to Portability~~ | ✅ Done (Phase 2-C, client-side) | - |
