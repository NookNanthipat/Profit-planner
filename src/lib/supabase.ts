import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ydaogwwblzjmjsbadivv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkYW9nd3dibHpqbWpzYmFkaXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjM2NDQsImV4cCI6MjA5MTk5OTY0NH0.WE7QXyu9aGLBb9W6-Rbv3x6CRem6TsctmgihbnzKVLk";

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
