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
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};
