import { supabase } from "./supabase";

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
  type: TxType;
  amount: number;
  occurred_on: string;
  note: string | null;
  created_at: string;
}

export interface PPMonthlySummary {
  income: number;
  expense: number;
  net: number;
  savings_rate: number;
  by_category: Array<{ category_id: string | null; name: string; color: string | null; icon: string | null; total: number }>;
  daily: Array<{ date: string; income: number; expense: number }>;
  start: string;
  end: string;
}

export const DEFAULT_CATEGORIES: Array<Omit<PPCategory, "id" | "user_id" | "created_at" | "parent_id">> = [
  { name: "Salary", type: "income", icon: "💼", color: "#10b981", sort_order: 1 },
  { name: "Bonus", type: "income", icon: "🎁", color: "#22c55e", sort_order: 2 },
  { name: "Investment", type: "income", icon: "📈", color: "#06b6d4", sort_order: 3 },
  { name: "Other Income", type: "income", icon: "💰", color: "#84cc16", sort_order: 4 },
  { name: "Food & Drink", type: "expense", icon: "🍜", color: "#f97316", sort_order: 1 },
  { name: "Transport", type: "expense", icon: "🚗", color: "#3b82f6", sort_order: 2 },
  { name: "Shopping", type: "expense", icon: "🛍️", color: "#ec4899", sort_order: 3 },
  { name: "Bills & Utilities", type: "expense", icon: "🧾", color: "#8b5cf6", sort_order: 4 },
  { name: "Housing", type: "expense", icon: "🏠", color: "#a16207", sort_order: 5 },
  { name: "Entertainment", type: "expense", icon: "🎬", color: "#d946ef", sort_order: 6 },
  { name: "Health", type: "expense", icon: "🏥", color: "#ef4444", sort_order: 7 },
  { name: "Other Expense", type: "expense", icon: "📦", color: "#64748b", sort_order: 8 },
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

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  credit: "Credit Card",
  ewallet: "E-Wallet",
};

export function formatMoney(value: number, currency = "THB") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
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
