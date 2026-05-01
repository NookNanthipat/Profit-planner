import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export function useProductAccess(slug: string) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setIsPro(false);
      setLoading(false);
      return;
    }
    (async () => {
      const { data: access } = await supabase.rpc("user_has_product_access", {
        _user_id: user.id,
        _product_slug: slug,
      });
      const hasIt = !!access;
      setHasAccess(hasIt);

      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (product) {
        const { data: upData } = await supabase
          .from("user_products")
          .select("status")
          .eq("user_id", user.id)
          .eq("product_id", product.id)
          .eq("status", "active")
          .maybeSingle();
        setIsPro(!!upData);
      }
      setLoading(false);
    })();
  }, [user?.id, slug]);

  return { hasAccess, isPro, loading };
}
