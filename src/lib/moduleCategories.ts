// Minimal stub for Phase 1 (design-system parity) — provides the shared
// types/colors that ported components (ModuleGridSection, RoleBadge via
// roles.ts) need to compile. The real role→module visibility matrix for
// Cashier/Store Manager/Warehouse Manager/Field Agent is built in Phase 4
// of the MMC dual-app rebuild (docs/Deep-Review-and-Dual-Mobile-Apps-Architectural-Plan.md);
// do not treat MODULE_CATEGORIES/ROLE_MODULES below as final.

export type UserRole = "owner" | "manager" | "staff" | "warehouse_manager" | "field_agent";

export interface ModuleItem {
  key: string;
  label: string;
  icon: string;
  desc: string;
  route: string;
}

export interface ModuleCategory {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
  children: ModuleItem[];
}

// Ported 1:1 from shopkeeper-app/src/lib/moduleCategories.ts — same category
// color meaning must hold across both apps (design-system §6).
export const CATEGORY_COLORS: Record<string, string> = {
  billing: "#2E9E5B",
  inventory: "#375DFB",
  "purchases-warehouse": "#7C5CFC",
  accounting: "#B37400",
  staff: "#C24868",
  operations: "#1E8E85",
  settings: "#6B7280",
};

// Placeholder — Phase 4 replaces this with the real Cashier/Store
// Manager/Warehouse Manager/Field Agent category grid.
export const MODULE_CATEGORIES: ModuleCategory[] = [];
