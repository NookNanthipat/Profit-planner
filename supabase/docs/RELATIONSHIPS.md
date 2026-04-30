# Table Relationships (Foreign Keys)
**Project:** ProfitPlanner (`ydaogwwblzjmjsbadivv`)  
**Last synced:** 2026-04-30

---

## Dependency Tree (ลบตามลำดับนี้เสมอ)

```
auth.users
├── profiles                        (user_id → auth.users)
├── user_roles                      (user_id → auth.users)
├── user_products                   (user_id → auth.users)
│   └── products                    (product_id → products)
├── activity_log                    (user_id, actor_id → auth.users)
│
├── pp_accounts                     (user_id → auth.users)
│   ├── pp_transactions             (account_id → pp_accounts)
│   ├── pp_debts                    (account_id → pp_accounts)
│   └── pp_recurring                (account_id → pp_accounts)
│
├── pp_categories                   (user_id → auth.users)
│   ├── pp_categories               (parent_id → pp_categories) ← self-ref ⚠️
│   ├── pp_transactions             (category_id → pp_categories)
│   ├── pp_recurring                (category_id → pp_categories)
│   └── pp_budgets                  (category_id → pp_categories)
│
├── pp_transactions                 (user_id → auth.users)
│   ├── pp_debts                    (debt_id → pp_debts)
│   └── pp_splits                   (transaction_id → pp_transactions) UNIQUE
│       └── pp_split_participants   (split_id → pp_splits)
│
├── pp_debts                        (user_id → auth.users)
├── pp_recurring                    (user_id → auth.users)
├── pp_budgets                      (user_id → auth.users)
│
├── pp_assets                       (user_id → auth.users)
│   ├── pp_asset_lots               (asset_id → pp_assets)
│   └── pp_asset_price_history      (asset_id → pp_assets)
│
├── pp_simulations                  (user_id → auth.users)
│
└── pp_people                       (user_id → auth.users)
    ├── pp_split_participants       (person_id → pp_people) nullable
    └── pp_split_payments           (person_id → pp_people) nullable

products                            (standalone, no parent)
pp_market_cache                     (standalone, no user_id)
pp_site_content                     (standalone, no user_id)
```

---

## Foreign Key Detail

### Platform

| Table | Column | References | On Delete |
|---|---|---|---|
| `profiles` | `user_id` | `auth.users.id` | CASCADE |
| `user_roles` | `user_id` | `auth.users.id` | CASCADE |
| `user_products` | `user_id` | `auth.users.id` | CASCADE |
| `user_products` | `product_id` | `products.id` | CASCADE |
| `activity_log` | `user_id` | `auth.users.id` | SET NULL |
| `activity_log` | `actor_id` | `auth.users.id` | SET NULL |

### ProfitPlanner Core

| Table | Column | References | On Delete |
|---|---|---|---|
| `pp_accounts` | `user_id` | `auth.users.id` | CASCADE |
| `pp_categories` | `user_id` | `auth.users.id` | CASCADE |
| `pp_categories` | `parent_id` | `pp_categories.id` | SET NULL ⚠️ |
| `pp_transactions` | `user_id` | `auth.users.id` | CASCADE |
| `pp_transactions` | `account_id` | `pp_accounts.id` | CASCADE |
| `pp_transactions` | `category_id` | `pp_categories.id` | SET NULL |
| `pp_transactions` | `debt_id` | `pp_debts.id` | SET NULL |
| `pp_debts` | `user_id` | `auth.users.id` | CASCADE |
| `pp_debts` | `account_id` | `pp_accounts.id` | SET NULL |
| `pp_recurring` | `user_id` | `auth.users.id` | CASCADE |
| `pp_recurring` | `category_id` | `pp_categories.id` | SET NULL |
| `pp_recurring` | `account_id` | `pp_accounts.id` | SET NULL |
| `pp_budgets` | `user_id` | `auth.users.id` | CASCADE |
| `pp_budgets` | `category_id` | `pp_categories.id` | SET NULL |

### Assets

| Table | Column | References | On Delete |
|---|---|---|---|
| `pp_assets` | `user_id` | `auth.users.id` | CASCADE |
| `pp_asset_lots` | `user_id` | `auth.users.id` | CASCADE |
| `pp_asset_lots` | `asset_id` | `pp_assets.id` | CASCADE |
| `pp_asset_price_history` | `user_id` | `auth.users.id` | CASCADE |
| `pp_asset_price_history` | `asset_id` | `pp_assets.id` | CASCADE |
| `pp_simulations` | `user_id` | `auth.users.id` | CASCADE |

### Split Payment

| Table | Column | References | On Delete |
|---|---|---|---|
| `pp_people` | `user_id` | `auth.users.id` | CASCADE |
| `pp_splits` | `user_id` | `auth.users.id` | CASCADE |
| `pp_splits` | `transaction_id` | `pp_transactions.id` | CASCADE |
| `pp_split_participants` | `split_id` | `pp_splits.id` | CASCADE |
| `pp_split_participants` | `person_id` | `pp_people.id` | SET NULL |
| `pp_split_payments` | `user_id` | `auth.users.id` | CASCADE |
| `pp_split_payments` | `split_id` | `pp_splits.id` | CASCADE |
| `pp_split_payments` | `person_id` | `pp_people.id` | SET NULL |

---

## ⚠️ Self-Referential FK

`pp_categories.parent_id → pp_categories.id`

ต้องรัน `UPDATE pp_categories SET parent_id = NULL WHERE user_id = uid` ก่อนทุกครั้งที่ต้องการ DELETE categories ของ user เพื่อป้องกัน FK violation

---

## Unique Constraints สำคัญ

| Table | Columns | ผลกระทบ |
|---|---|---|
| `user_products` | `(user_id, product_id)` | 1 entitlement ต่อ product ต่อ user |
| `pp_budgets` | `(user_id, month, category_id)` | 1 budget ต่อ category ต่อเดือน |
| `pp_splits` | `(transaction_id)` | 1 split ต่อ transaction |
| `pp_split_participants` | `(split_id, person_id)` | 1 คนต่อ split |
| `pp_asset_price_history` | `(asset_id, recorded_at)` | 1 ราคาต่อวันต่อ asset |
| `pp_site_content` | `(section, key)` | unique CMS key |
| `profiles` | `(user_id)` | 1 profile ต่อ user |
| `user_roles` | `(user_id, role)` | ไม่มี duplicate role |
