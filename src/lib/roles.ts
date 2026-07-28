import type { UserRole } from "./moduleCategories";

// Plain-language role names and per-role badge colors — the single source
// every screen pulls from instead of re-declaring its own copy (previously
// duplicated in index.tsx and profile.tsx with slightly different labels).
// See shopkeeper-mobile-design-system.md §4.1 and §8.1.
// Labels and colors match docs/Deep-Review-and-Dual-Mobile-Apps-Architectural-Plan.md
// §5 exactly (each role's dynamic header badge spec).
export const ROLE_LABELS: Record<string, string> = {
 owner: "Owner",
 manager: "Store Manager",
 staff: "Cashier / Biller",
 warehouse_manager: "Warehouse Manager",
 field_agent: "Field Agent",
 general_staff: "General Staff",
 peon: "Peon / Helper",
};

export const ROLE_COLORS: Record<string, string> = {
 owner: "#0368FE",
 manager: "#8B5CF6",
 staff: "#10B981",
 warehouse_manager: "#F97316",
 field_agent: "#0368FE",
 general_staff: "#7C3AED",
 peon: "#D97706",
};

export function roleLabel(role: UserRole | string | null | undefined): string {
 return ROLE_LABELS[role || ""] || "User";
}

export function roleColor(role: UserRole | string | null | undefined): string {
 return ROLE_COLORS[role || ""] || "#6B7280";
}
