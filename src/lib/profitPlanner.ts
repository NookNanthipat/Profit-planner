import { supabase } from "@/lib/supabase";

// ─── Base Types (Phase A) ─────────────────────────────────────────────────────
export type AccountType = "cash" | "bank" | "credit" | "ewallet";
export type TxType = "income" | "expense";

export interface PPAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  archived: boolean;
  created_at: string;
}

export interface PPCategory {
  id: string;
  user_id: string;
  name: string;
  type: TxType;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface PPTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  debt_id?: string | null;
  type: TxType;
  amount: number;
  occurred_on: string;
  note: string | null;
  created_at: string;
}

export interface PPPerson {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  color: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface PPSplit {
  id: string;
  user_id: string;
  transaction_id: string;
  due_date: string | null;
  note: string | null;
  created_at: string;
  participants?: PPSplitParticipant[];
}

export type SplitMode = "amount" | "percent";

export interface PPSplitParticipant {
  id: string;
  split_id: string;
  person_id: string | null; // null = 'self'
  mode: SplitMode;
  value: number;
  actual_amount: number;
  created_at: string;
}

export interface PPSplitPayment {
  id: string;
  user_id: string;
  split_id: string;
  person_id: string | null;
  amount: number;
  paid_on: string;
  note: string | null;
  created_at: string;
}

export type AssetType = "stock" | "stock_us" | "fund" | "gold" | "crypto" | "bond" | "cash" | "property" | "other";

export interface PPAsset {
  id: string;
  user_id: string;
  name: string;
  full_name: string | null;
  type: AssetType;
  currency: string;
  sector: string | null;
  current_price: number;
  last_price_updated_at: string | null;
  created_at: string;
  lots?: PPAssetLot[];
  history?: PPAssetPriceHistory[];
}

export interface PPAssetLot {
  id: string;
  user_id: string;
  asset_id: string;
  qty: number;
  cost_per_unit: number;
  occurred_on: string;
  note: string | null;
  created_at: string;
}

export interface PPAssetPriceHistory {
  id: string;
  user_id: string;
  asset_id: string;
  price: number;
  recorded_at: string;
  created_at: string;
}

export interface PPSimulation {
  id: string;
  user_id: string;
  name: string;
  config: any;
  created_at: string;
  updated_at: string;
}

export interface PPMonthlySummary {
  income: number;
  expense: number;
  net: number;
  savings_rate: number;
  by_category: Array<{
    category_id: string | null;
    name: string;
    color: string | null;
    icon: string | null;
    total: number;
  }>;
  daily: Array<{ date: string; income: number; expense: number }>;
  start: string;
  end: string;
}

// ─── Default Categories (Phase A) ────────────────────────────────────────────
export const DEFAULT_CATEGORIES: Array<
  Omit<PPCategory, "id" | "user_id" | "created_at" | "parent_id">
> = [
  { name: "Salary",         type: "income",  icon: "💼", color: "#10b981", sort_order: 1 },
  { name: "Bonus",          type: "income",  icon: "🎁", color: "#22c55e", sort_order: 2 },
  { name: "Investment",     type: "income",  icon: "📈", color: "#06b6d4", sort_order: 3 },
  { name: "Other Income",   type: "income",  icon: "💰", color: "#84cc16", sort_order: 4 },
  { name: "Food & Drink",   type: "expense", icon: "🍜", color: "#f97316", sort_order: 1 },
  { name: "Transport",      type: "expense", icon: "🚗", color: "#3b82f6", sort_order: 2 },
  { name: "Shopping",       type: "expense", icon: "🛍️", color: "#ec4899", sort_order: 3 },
  { name: "Bills & Utilities", type: "expense", icon: "🧾", color: "#8b5cf6", sort_order: 4 },
  { name: "Housing",        type: "expense", icon: "🏠", color: "#a16207", sort_order: 5 },
  { name: "Entertainment",  type: "expense", icon: "🎬", color: "#d946ef", sort_order: 6 },
  { name: "Health",         type: "expense", icon: "🏥", color: "#ef4444", sort_order: 7 },
  { name: "Other Expense",  type: "expense", icon: "📦", color: "#64748b", sort_order: 8 },
];

export async function seedDefaultCategoriesIfEmpty(userId: string) {
  const { count } = await supabase
    .from("pp_categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return;
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
  await supabase.from("pp_categories").insert(rows);
}

// ─── Helpers (Phase A) ────────────────────────────────────────────────────────
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash:    "Cash",
  bank:    "Bank",
  credit:  "Credit Card",
  ewallet: "E-Wallet",
};

export function formatMoney(value: number, currency = "THB") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthFirstDay(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

// ─── Recurring Types (Phase B) ────────────────────────────────────────────────
export type RecurringFrequency =
  | "daily" | "weekly" | "biweekly" | "monthly"
  | "quarterly" | "biannual" | "yearly";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily:     "Daily",
  weekly:    "Weekly",
  biweekly:  "Every 2 weeks",
  monthly:   "Monthly",
  quarterly: "Every 3 months",
  biannual:  "Every 6 months",
  yearly:    "Yearly",
};

export const FREQUENCY_MONTHLY: Record<RecurringFrequency, number> = {
  daily:     30,
  weekly:    4.33,
  biweekly:  2.17,
  monthly:   1,
  quarterly: 1 / 3,
  biannual:  1 / 6,
  yearly:    1 / 12,
};

export interface PPRecurring {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  category_id: string | null;
  account_id: string | null;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Budget Types (Phase B) ───────────────────────────────────────────────────
export interface PPBudget {
  id: string;
  user_id: string;
  month: string;
  category_id: string | null;
  planned_amount: number;
  currency: string;
  note: string | null;
  created_at: string;
}

export interface PPBudgetSummaryRow {
  category_id: string | null;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  category_type: string;
  planned_amount: number;
  actual_amount: number;
}

// ─── Recurring Queries (Phase B) ──────────────────────────────────────────────
export async function fetchRecurring(userId: string) {
  const { data, error } = await supabase
    .from("pp_recurring")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as PPRecurring[];
}

export async function upsertRecurring(
  userId: string,
  payload: Omit<PPRecurring, "id" | "user_id" | "created_at" | "next_due">,
  id?: string,
) {
  const row = { ...payload, user_id: userId };
  if (id) {
    const { error } = await supabase.from("pp_recurring").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("pp_recurring").insert(row);
    if (error) throw error;
  }
}

export async function deleteRecurring(id: string) {
  const { error } = await supabase.from("pp_recurring").delete().eq("id", id);
  if (error) throw error;
}

export async function bookRecurringNow(
  userId: string,
  rec: PPRecurring,
  date: string,
  amount: number,
) {
  const monthStr = date.slice(0, 7);
  const [y, m] = monthStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
  
  console.log(`[Recurring] Checking duplicates for "${rec.name}" (${amount}) in ${monthStr}`);

  // 1. Fetch ALL transactions for this month to be absolutely sure
  const { data: monthTxs, error: fetchErr } = await supabase
    .from("pp_transactions")
    .select("amount, note, occurred_on")
    .eq("user_id", userId)
    .gte("occurred_on", `${monthStr}-01`)
    .lte("occurred_on", monthEnd);

  if (fetchErr) throw fetchErr;

  // 2. High-precision matching
  const normalize = (s: string) => {
    return (s || "")
      .toLowerCase()
      .replace(/\(recurring\)/g, "") // Remove the suffix specifically
      .replace(/[^a-z0-9]/g, "")     // Remove all symbols
      .trim();
  };

  const planNameClean = normalize(rec.name);

  const isDuplicate = (monthTxs || []).some(t => {
    const txAmount = parseFloat(String(t.amount));
    const sameAmount = Math.abs(txAmount - amount) < 0.01;
    const dbNoteClean = normalize(t.note || "");
    
    // Check for match: normalized names must be identical or one must contain the other fully
    const nameMatch = dbNoteClean === planNameClean || 
                      dbNoteClean.includes(planNameClean) || 
                      planNameClean.includes(dbNoteClean);
                      
    return sameAmount && nameMatch;
  });

  if (isDuplicate) {
    console.warn(`[Recurring] Duplicate prevented for "${rec.name}" in ${monthStr}`);
    throw new Error(`Duplicate prevented: "${rec.name}" already exists in ${monthStr}.`);
  }

  // 3. Secure Insertion
  const { error: insErr } = await supabase.from("pp_transactions").insert({
    user_id: userId,
    account_id: rec.account_id,
    category_id: rec.category_id,
    type: rec.type,
    amount,
    occurred_on: date,
    note: rec.name.includes("(Recurring)") ? rec.name : `${rec.name} (Recurring)`,
  });
  
  if (insErr) throw insErr;
}

// ─── Budget Queries (Phase B) ─────────────────────────────────────────────────
export async function fetchBudgets(userId: string, month: string) {
  const { data, error } = await supabase
    .from("pp_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month);
  if (error) throw error;
  return (data ?? []) as PPBudget[];
}

export async function upsertBudget(
  userId: string,
  month: string,
  categoryId: string | null,
  plannedAmount: number,
  note?: string,
) {
  const { error } = await supabase.from("pp_budgets").upsert(
    {
      user_id: userId,
      month,
      category_id: categoryId,
      planned_amount: plannedAmount,
      note: note ?? null,
    },
    { onConflict: "user_id,month,category_id" },
  );
  if (error) throw error;
}

export async function fetchBudgetSummary(userId: string, month: string) {
  const { data, error } = await supabase.rpc("pp_budget_summary", {
    _user_id: userId,
    _month: month,
  });
  if (error) throw error;
  return (data ?? []) as PPBudgetSummaryRow[];
}

export async function copyBudgetFromMonth(
  userId: string,
  fromMonth: string,
  toMonth: string,
) {
  const rows = await fetchBudgets(userId, fromMonth);
  if (!rows.length) return;
  const inserts = rows.map((r) => ({
    user_id: userId,
    month: toMonth,
    category_id: r.category_id,
    planned_amount: r.planned_amount,
    note: r.note,
  }));
  const { error } = await supabase.from("pp_budgets").upsert(inserts, {
    onConflict: "user_id,month,category_id",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}