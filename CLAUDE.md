# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Dev server on port 8082
bun run build    # Production build
bun run lint     # ESLint
bun run test     # Vitest (single run)
bun run test:watch  # Vitest watch mode
```

Run a single test file: `bun run test src/test/example.test.ts`

## Architecture Overview

This is a **React 18 + TypeScript + Vite** SPA. Package manager is **Bun**. Path alias `@/` resolves to `src/`.

### Route Structure

```
/                      → Landing page (marketing)
/login                 → Auth page (email + Google OAuth)
/portal                → Product catalog + user dashboard (protected)
/app/profit-planner/*  → The finance app (protected + product-gated)
/admin/*               → Admin area (protected + admin-role-gated)
/privacy, /tos         → Legal pages
```

### Auth & Access Control

- **`src/hooks/useAuth.tsx`** — `AuthContext` wrapping the app. Exposes `{ session, user, loading, isAdmin, signOut }`. Admin status is fetched from `user_roles` table.
- **`src/components/ProtectedRoute.tsx`** — redirects unauthenticated users to `/login`, optionally enforces admin role.
- **`src/pages/app/ProfitPlannerLayout.tsx`** — checks product access via Supabase RPC `user_has_product_access('profit-planner')`. Free routes (`/dashboard`, `/transactions`, `/setup`) are available to all purchasers; all other modules (`/budget`, `/recurring`, `/portfolio`, etc.) are paywalled behind Pro status (active `user_products` row). Non-Pro users see a `PaywallOverlay` and blurred content.
- **15-minute idle auto-logout** via `src/hooks/useIdleTimeout.ts`, applied in `ProfitPlannerLayout`.

### Backend: Supabase

- Client initialized in **`src/lib/supabase.ts`** with `persistSession: true`, `storage: localStorage`.
- All financial tables use **RLS** — users can only read/write their own rows (`user_id = auth.uid()`).
- Key Supabase tables: `products`, `user_products`, `user_roles`, `profiles`, `site_content`
- ProfitPlanner-specific tables (prefixed `pp_`): `pp_accounts`, `pp_categories`, `pp_transactions`, `pp_recurring`, `pp_budgets`, `pp_assets`, `pp_asset_lots`, `pp_asset_price_history`, `pp_simulations`, `pp_splits`, `pp_split_participants`, `pp_split_payments`, `pp_persons`
- Key RPCs: `user_has_product_access(_user_id, _product_slug)`, `pp_monthly_summary(_user_id, _month)`, `pp_budget_summary(_user_id, _month)`, `delete_user_data_and_account`

### Data Layer

**`src/lib/profitPlanner.ts`** is the single source of truth for all ProfitPlanner types and Supabase queries. Add new PP-related types and query functions here. On first app entry, `seedDefaultCategoriesIfEmpty(userId)` inserts default income/expense categories.

### i18n

Bilingual EN/TH via `react-i18next`. Translation files: `src/i18n/en.json` and `src/i18n/th.json`. Language preference persisted in `localStorage` under key `profitplanner-lang`. Use `const { t, i18n } = useTranslation()` — check `i18n.language === "th"` for direct Thai string conditionals used in some older components.

### UI

- **shadcn/ui** components live in `src/components/ui/` — do not edit these manually, they are managed by the shadcn CLI.
- Charts use **Recharts**.
- Animations use **Framer Motion**.
- `src/modules_source/*.jsx` — reference JSX modules used as implementation templates during development. Not imported by the app directly.

### Admin

Admin pages (`src/pages/admin/`) and layout (`src/components/admin/`) are accessible only to users with `role = 'admin'` in `user_roles`. `EditableText` and `EditableButton` components allow inline CMS editing of `site_content` rows in Supabase when the admin is logged in.
