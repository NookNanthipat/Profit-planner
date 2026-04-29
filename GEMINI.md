# ProfitPlanner — Project Context & Engineering Standards

ProfitPlanner is a comprehensive personal finance application built with a modern "Fintech" aesthetic. It enables users to track transactions, manage debts with amortization schedules, set budgets, and monitor recurring cash flows.

## Project Overview

- **Core Technologies:** React 18 (TypeScript), Vite, Tailwind CSS, Shadcn UI (Radix UI), Recharts, Framer Motion.
- **Backend:** Supabase (BaaS) providing Authentication, PostgreSQL (RLS enabled), and Edge Functions/RPCs for complex calculations.
- **Localization:** 100% English primary interface using `i18next`. Thai strings are restricted to translation files.
- **Architecture:** 
    - **Pages:** Located in `src/pages/app/profit-planner/`.
    - **Components:** Modular components in `src/components/profit-planner/` and UI primitives in `src/components/ui/`.
    - **Logic:** Centralized domain logic, types, and constants in `src/lib/profitPlanner.ts`.
    - **API:** Supabase client and query logic in `src/lib/supabase.ts`.

## Key Features & Logic

- **Debt Matrix:** Manages loans with dynamic amortization schedules. It uses a `buildSchedule` helper that cross-references `pp_transactions` with `pp_debts` to determine real-time payment status.
- **Transactions Ledger:** Central log for all fiscal events. Supports bidirectional sync with the Debt module (deleting a debt payment transaction restores the debt balance).
- **Budgeting:** Monthly category-based planning with actual-vs-planned analysis.
- **Recurring Engine:** Automated tracking for subscription and salary-like items.

## Building and Running

- **Development:** `npm run dev` (starts the Vite server).
- **Production Build:** `npm run build` (generates static assets in `dist/`).
- **Testing:** `npm run test` (executes Vitest suite).
- **Linting:** `npm run lint` (ESLint with TypeScript support).

## Engineering Standards

### 1. UI & Aesthetics
- **Color Palette:** Modern Fintech look using Navy, Gold, Cream, and Emerald.
- **Typography:** Space Grotesk for headers and Inter for body text.
- **Interactive:** Use Framer Motion for smooth transitions and `canvas-confetti` for celebratory events (e.g., debt payoff).
- **Standards:** All date pickers must use the Shadcn Popover + Calendar component, never native HTML `<input type="date">`.

### 2. Date & Time Handling
- **Constraint:** Always handle dates as `YYYY-MM-DD` strings to avoid timezone-related "day-shifting" (e.g., selecting the 5th but getting the 4th).
- **Implementation:** When creating `Date` objects from strings, always append `T00:00:00` (e.g., `new Date(dateString + "T00:00:00")`) to ensure local-time boundary processing. Use `date-fns` for formatting.

### 3. Data Integrity & Sync
- **Bidirectional Sync:** Changes to `pp_transactions` must reflect in `pp_debts` if a `debt_id` is present.
- **Session Management:** Complex forms (like `TransactionForm`) must use the `sessionKey` pattern or similar state-reset prevention to avoid losing user input during background data refreshes.
- **Validation:** Use `zod` for client-side schema validation and Supabase RLS for server-side security.

### 4. Localization
- **Rule:** 100% English UI.
- **Action:** If Thai strings are found in the JSX, they must be moved to `src/i18n/` or translated directly to English if they are static UI labels.

## Database Schema Highlights

- `pp_accounts`: Financial sources (Cash, Bank, Credit Card).
- `pp_categories`: Hierarchical categories (Parent > Sub).
- `pp_transactions`: The primary ledger (linked to accounts and categories).
- `pp_debts`: Loan metadata and current balance.
- `pp_budgets`: Monthly planning records.
- `pp_recurring`: Template records for repeated events.
