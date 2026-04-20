import type { Product } from "./supabase";

export type ProductStatus = "live" | "coming_soon" | "draft";

export const getProductStatus = (p: Pick<Product, "is_active" | "is_coming_soon">): ProductStatus => {
  if (!p.is_active) return "draft";
  if (p.is_coming_soon) return "coming_soon";
  return "live";
};

export const statusToFlags = (s: ProductStatus): { is_active: boolean; is_coming_soon: boolean } => {
  switch (s) {
    case "live": return { is_active: true, is_coming_soon: false };
    case "coming_soon": return { is_active: true, is_coming_soon: true };
    case "draft": return { is_active: false, is_coming_soon: false };
  }
};

export const statusLabel: Record<ProductStatus, string> = {
  live: "Live",
  coming_soon: "Coming Soon",
  draft: "Draft",
};

export const statusBadgeVariant: Record<ProductStatus, "default" | "secondary" | "outline"> = {
  live: "default",
  coming_soon: "secondary",
  draft: "outline",
};
