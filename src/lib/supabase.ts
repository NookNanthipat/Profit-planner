import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  description_th: string | null;
  price_cents: number;
  currency: string;
  is_active: boolean;
  is_coming_soon: boolean;
  app_route: string | null;
  badge: string | null;
  price_thb: number | null;
  sort_order: number;
  created_at: string;
};

export type EntitlementStatus = "active" | "inactive" | "trial" | "expired";

export type UserProduct = {
  id: string;
  user_id: string;
  product_id: string;
  status: EntitlementStatus;
  purchased_at: string;
  expired_at: string | null;
};

export type AppRole = "admin" | "user";
