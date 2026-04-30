import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // defer Supabase calls outside of the callback
        setTimeout(() => fetchAdminStatus(newSession.user.id), 0);
        // Record PDPA consent for Google OAuth signups (stored in localStorage before redirect)
        if (event === "SIGNED_IN") {
          const raw = localStorage.getItem("pp_pending_consent");
          if (raw) {
            const userId = newSession.user.id;
            setTimeout(async () => {
              try {
                const consent = JSON.parse(raw);
                const { count } = await supabase
                  .from("consent_records")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId);
                if (count === 0) {
                  await supabase.from("consent_records").insert({
                    user_id: userId,
                    policy_version: consent.policy_version,
                    accepted_tos: consent.accepted_tos,
                    accepted_privacy: consent.accepted_privacy,
                    accepted_marketing: consent.accepted_marketing,
                    user_agent: consent.user_agent,
                  });
                }
              } catch {
                // consent recording is best-effort; do not block the user
              } finally {
                localStorage.removeItem("pp_pending_consent");
              }
            }, 0);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) fetchAdminStatus(existing.user.id);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const fetchAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
