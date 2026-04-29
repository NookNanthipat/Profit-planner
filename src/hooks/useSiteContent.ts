import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface ContentMap {
  [key: string]: string;
}

export function useSiteContent(section: string) {
  const { i18n, t } = useTranslation();
  const [overrides, setOverrides] = useState<ContentMap>({});
  const [version, setVersion] = useState(0); // Used to force refresh
  const [isReady, setIsReady] = useState(false);
  const lang = i18n?.language || 'en';

  const load = useCallback(async () => {
    // If i18n is not initialized or we don't have a lang yet, don't load
    if (!i18n.isInitialized) return;
    
    try {
      const { data, error } = await supabase
        .from("pp_site_content")
        .select("key, value_en, value_th")
        .eq("section", section);

      if (error) throw error;

      if (data) {
        const map: ContentMap = {};
        const activeLang = lang.split('-')[0];
        
        data.forEach((item) => {
          const val = activeLang === "th" ? item.value_th : item.value_en;
          if (typeof val === 'string' && val.trim().length > 0) {
            map[item.key] = val;
          }
        });
        setOverrides(map);
      }
      setIsReady(true);
    } catch (e) {
      console.error(`CMS Load Error [${section}]:`, e);
      setIsReady(true); // Still set ready so we show fallback
    }
  }, [section, lang, i18n.isInitialized]);

  useEffect(() => {
    load();
  }, [load, version]);

  const refresh = () => setVersion(v => v + 1);

  const ds = (key: string, defaultPath: string, fallback: string = ""): string => {
    const dbVal = overrides[key];
    if (typeof dbVal === 'string' && dbVal.length > 0) return dbVal;
    
    if (defaultPath) {
      try {
        const translation = t(defaultPath);
        // If translation is missing (returns the key), use the fallback or a cleaned version of the key
        if (typeof translation === 'string' && translation !== defaultPath) return translation;
      } catch (e) {}
    }
    
    // Final fallback: use the provided fallback string, or clean the path (nav.welcome -> Welcome)
    if (fallback) return fallback;
    const parts = defaultPath.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/_/g, ' ');
  };

  const isVisible = overrides["_visible"] !== "false";

  const dsList = (key: string, defaultPath: string): any[] => {
    const dbVal = overrides[key];
    if (dbVal) {
      try {
        return JSON.parse(dbVal);
      } catch (e) {
        console.error("List parse error", e);
      }
    }
    const fallback = t(defaultPath, { returnObjects: true });
    return Array.isArray(fallback) ? fallback : [];
  };

  return { ds, dsList, isVisible, overrides, refresh, isReady };
}
