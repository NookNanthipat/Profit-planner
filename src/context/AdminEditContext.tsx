import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import i18n from "@/i18n";

interface AdminEditContextType {
  isEditMode: boolean;
  setEditMode: (mode: boolean) => void;
  activeSection: string | null;
  setActiveSection: (section: string | null) => void;
  previewLanguage: "en" | "th";
  setPreviewLanguage: (lang: "en" | "th") => void;
}

const AdminEditContext = createContext<AdminEditContextType | undefined>(undefined);

export const AdminEditProvider = ({ children }: { children: ReactNode }) => {
  const [isEditMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<"en" | "th">(
    (i18n.language?.split("-")[0] as "en" | "th") || "en"
  );

  useEffect(() => {
    const handleLangChange = (lng: string) => {
      setPreviewLanguage(lng.split("-")[0] as "en" | "th");
    };
    i18n.on("languageChanged", handleLangChange);
    return () => i18n.off("languageChanged", handleLangChange);
  }, []);

  return (
    <AdminEditContext.Provider 
      value={{ 
        isEditMode, setEditMode, 
        activeSection, setActiveSection,
        previewLanguage, setPreviewLanguage
      }}
    >
      {children}
    </AdminEditContext.Provider>
  );
};

export const useAdminEdit = () => {
  const context = useContext(AdminEditContext);
  if (context === undefined) {
    throw new Error("useAdminEdit must be used within an AdminEditProvider");
  }
  return context;
};
