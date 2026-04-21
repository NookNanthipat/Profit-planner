

## Phase A — ProfitPlanner App Foundation

สร้าง 3 modules พื้นฐาน: **Setup → Transactions → Monthly Dashboard** พร้อม layout sidebar+bottom-tab branded เป็น "ProfitPlanner" (แยก brand จาก FinnFlow)

### 1. Branding & Logo
- Copy logo ที่ user upload → `public/profitplanner-logo.png`
- App ใช้ชื่อ **"ProfitPlanner — Ultimate Personal Finance App"** (ไม่ใช้ FinnFlow ภายใน app นี้)
- เก็บ palette navy/gold/cream เดิม + serif headings ให้กลมกลืนกับ portal

### 2. Layout (แบบ A — Sidebar + Bottom tab)

```text
Desktop (≥1024px)               Mobile
┌───────────────────────┐      ┌─────────────┐
│ [logo] ProfitPlanner  │      │ ProfitPlanner│
├──────┬────────────────┤      ├─────────────┤
│ 📊   │                │      │             │
│ 💸   │   content      │      │  content    │
│ ⚙️   │                │      │             │
│ ←Portal               │      ├─────────────┤
└──────┴────────────────┘      │ 📊 💸 ⚙️ ←  │
                                └─────────────┘
```

- Top bar: logo + ชื่อ app + ปุ่ม "← Portal" (กลับ `/portal`)
- Sidebar (desktop): Dashboard / Transactions / Setup
- Bottom tab (mobile): icon เดียวกัน
- Routes: `/app/profit-planner` (redirect → `/dashboard`), `/dashboard`, `/transactions`, `/setup`
- Guard: ตรวจ `user_has_product_access('profit-planner')` เหมือนเดิม

### 3. Modules

**Setup** (`/app/profit-planner/setup`)
- Tabs: **Accounts** | **Categories**
- Accounts: ชื่อ + ประเภท (cash/bank/credit/ewallet) + ยอดเริ่มต้น + สกุลเงิน (THB default)
- Categories: ชื่อ + type (income/expense) + ไอคอน + สี + parent (optional)
- Seed default categories ครั้งแรก (Food, Transport, Salary ฯลฯ)

**Transactions** (`/app/profit-planner/transactions`)
- ตาราง list: date, account, category, amount, note + filter (เดือน, account, category, type)
- ปุ่ม "+ Add" → dialog form: type / amount / date / account / category / note
- Edit/Delete ผ่าน row action
- Mobile: card layout แทน table

**Monthly Dashboard** (`/app/profit-planner/dashboard`)
- Month picker (default = เดือนปัจจุบัน)
- การ์ดสรุป: **Income / Expense / Net / Savings rate**
- Pie chart: expense by category
- Bar chart: daily flow ตลอดเดือน
- List: top 5 expense categories + recent 5 transactions

### 4. Database (Supabase migration)

ตารางใหม่ (RLS: user เห็น/แก้ได้เฉพาะของตัวเอง):

- `pp_accounts` — id, user_id, name, type, currency, opening_balance, archived, created_at
- `pp_categories` — id, user_id, name, type (income/expense), icon, color, parent_id, sort_order
- `pp_transactions` — id, user_id, account_id, category_id, type, amount, occurred_on, note, created_at
- RPC `pp_monthly_summary(_user_id, _month)` → return income/expense/net + by_category JSON
- Trigger: เมื่อ user signup ครั้งแรกที่เข้า ProfitPlanner → seed default categories (handle ใน app code แทน trigger เพื่อให้ง่าย)
- Indexes: `(user_id, occurred_on desc)` บน transactions

### 5. Files ที่จะสร้าง/แก้

**ใหม่:**
- `public/profitplanner-logo.png` (copy จาก upload)
- `supabase_phase_a.sql` — schema + RLS + RPC
- `src/pages/app/ProfitPlannerLayout.tsx` — sidebar + bottom tab + topbar
- `src/pages/app/profit-planner/Dashboard.tsx`
- `src/pages/app/profit-planner/Transactions.tsx`
- `src/pages/app/profit-planner/Setup.tsx`
- `src/components/profit-planner/AccountForm.tsx`
- `src/components/profit-planner/CategoryForm.tsx`
- `src/components/profit-planner/TransactionForm.tsx`
- `src/lib/profitPlanner.ts` — types + supabase queries + seed defaults

**แก้:**
- `src/App.tsx` — เปลี่ยน `/app/profit-planner` จาก single page เป็น nested routes ภายใต้ `ProfitPlannerLayout`
- ลบ `src/pages/ProfitPlannerApp.tsx` (แทนที่ด้วย layout + dashboard)

### 6. Action ที่ user ต้องทำหลังเสร็จ
1. รัน `supabase_phase_a.sql` ใน Supabase SQL Editor
2. เข้า `/app/profit-planner` → เพิ่ม account แรก → เพิ่ม transaction → ดู dashboard

### Out of scope (ไป Phase ถัดไป)
Recurring, Split Payment, Budget, Annual Dashboard, Debt, Portfolio, Simulator

