export type UserRole = "owner" | "manager" | "staff" | "warehouse_manager" | "field_agent";

export interface ModuleItem {
 key: string;
 label: string;
 icon: string;
 desc: string;
 route: string;
 // Optional company enabledModules toggle key — see shopkeeper-app/src/lib/moduleCategories.ts
 // for the full rationale. Omitted means always visible to a role-permitted user.
 gateKey?: string;
}

export interface ModuleCategory {
 id: string;
 label: string;
 icon: string;
 roles: UserRole[];
 children: ModuleItem[];
}

// MMC Employee App — role-adaptive module grid for Cashier, Store Manager,
// and Warehouse Manager (per docs/Deep-Review-and-Dual-Mobile-Apps-Architectural-Plan.md
// §5). Field Agent is NOT covered here — that role keeps its existing fixed
// 5-tab layout (Home/Attendance/Tasks/Expenses/Profile in app/(tabs)/),
// unrelated to this grid system, per the design doc's persona guidance that
// a field agent's job is a handful of fixed actions, not a browsable grid.
//
// Screens referenced below were ported from shopkeeper-app/app/ — same
// files, adapted import paths only, business logic untouched.
export const MODULE_CATEGORIES: ModuleCategory[] = [
 {
 id: "billing",
 label: "Billing & Sales",
 icon: "receipt",
 roles: ["staff", "manager"],
 children: [
 { key: "pos", label: "POS Billing", icon: "point-of-sale", desc: "Counter billing terminal", route: "/pos" },
 { key: "history", label: "Invoice History", icon: "history", desc: "Past transaction records", route: "/invoice-history" },
 { key: "held-bills", label: "Held Bills", icon: "content-save", desc: "Parked bills to resume", route: "/invoice-history" },
 { key: "returns", label: "Returns", icon: "backup-restore", desc: "Sales returns and refunds", route: "/invoice-history" },
 { key: "b2b", label: "B2B Sales", icon: "briefcase-account", desc: "Wholesale invoicing", route: "/b2b" },
 { key: "estimates", label: "Orders & Quotes", icon: "file-document-outline", desc: "Estimates and quotations", route: "/estimates" },
 { key: "sales-orders", label: "Sales Orders", icon: "clipboard-list-outline", desc: "Sales order tracking", route: "/sales-orders" },
 ],
 },
 {
 id: "inventory",
 label: "Inventory & Stock",
 icon: "package-variant",
 roles: ["manager", "warehouse_manager"],
 children: [
 { key: "inventory", label: "Stock View", icon: "package-variant-closed", desc: "Product catalog and stock", route: "/inventory" },
 { key: "categories", label: "Categories", icon: "tag", desc: "Product categories", route: "/categories" },
 { key: "barcodes", label: "Barcodes", icon: "barcode", desc: "Barcode label generation", route: "/barcode-generator" },
 { key: "reorder-suggestions", label: "Reorder Suggestions", icon: "cart-arrow-down", desc: "Low-stock reorder alerts", route: "/reorder-suggestions" },
 ],
 },
 {
 id: "purchases-warehouse",
 label: "Purchases & Warehouse",
 icon: "truck-delivery",
 roles: ["manager", "warehouse_manager"],
 children: [
 { key: "purchases", label: "Purchases / GRN", icon: "truck", desc: "Stock purchase entry", route: "/purchase-entry" },
 { key: "purchase-orders", label: "Purchase Orders", icon: "clipboard-text", desc: "PO creation and management", route: "/purchase-orders" },
 { key: "warehouse", label: "Stock Transfers", icon: "transfer", desc: "Transfer requests/approvals", route: "/stock-transfer-requests" },
 { key: "challans", label: "Challans", icon: "clipboard-list", desc: "Delivery challans", route: "/challans" },
 ],
 },
 {
 id: "accounting",
 label: "Accounting & Payments",
 icon: "account-cash",
 roles: ["staff", "manager"],
 children: [
 { key: "ledger", label: "Party Ledger", icon: "account-group", desc: "Customer/supplier ledger", route: "/ledger" },
 { key: "payments", label: "Payments", icon: "credit-card", desc: "Payment in/out recording", route: "/payment-history" },
 { key: "expenses", label: "Expenses", icon: "wallet", desc: "Operational expense tracking", route: "/expenses" },
 ],
 },
 // "staff" role gets this category too — for the "Shift Close" child only
 // (ROLE_MODULES.staff omits the "staff" key, so Staff Roster stays
 // manager-only). Spec: docs/Deep-Review-and-Dual-Mobile-Apps-
 // Architectural-Plan.md §5.1 "Cash Drawer & Shift Reconciliation".
 {
 id: "staff",
 label: "Staff & Shift",
 icon: "account-tie",
 roles: ["manager", "staff"],
 children: [
 { key: "staff", label: "Staff Roster", icon: "account-multiple-outline", desc: "Own-outlet staff & attendance", route: "/staff" },
 { key: "shift-reconciliation", label: "Shift Close", icon: "cash-register", desc: "Cash shift reconciliation", route: "/shift-reconciliation" },
 ],
 },
 {
 id: "settings",
 label: "Settings",
 icon: "cog",
 roles: ["staff", "manager", "warehouse_manager"],
 children: [
 { key: "printer-settings", label: "Printer", icon: "printer", desc: "Printer configuration", route: "/printer-settings" },
 ],
 },
];

export const ALL_MODULES = [
 "pos", "history", "held-bills", "returns", "b2b", "estimates", "sales-orders",
 "inventory", "categories", "barcodes", "reorder-suggestions",
 "purchases", "purchase-orders", "warehouse", "challans",
 "ledger", "payments", "expenses",
 "staff", "shift-reconciliation",
 "printer-settings",
];

// Approval-ceiling matrix from the Deep Review doc §4/§5 (Cashier: POS +
// History only, no B2B/Inventory/Purchases/Accounting-beyond-payments-in;
// Store Manager: full staff-facing breadth within one outlet; Warehouse
// Manager: stock/purchases/transfers/challans, no billing or accounting).
export const ROLE_MODULES: Record<UserRole, string[]> = {
 owner: [], // Owner uses shopkeeper-app's full-parity admin view, not this app.
 manager: [
 "pos", "history", "held-bills", "returns", "b2b", "estimates", "sales-orders",
 "inventory", "categories", "barcodes", "reorder-suggestions",
 "purchases", "purchase-orders", "warehouse", "challans",
 "ledger", "payments", "expenses",
 "staff", "shift-reconciliation",
 "printer-settings",
 ],
 staff: [
 "pos", "history", "held-bills", "returns",
 "ledger", "payments",
 "shift-reconciliation",
 "printer-settings",
 ],
 warehouse_manager: [
 "inventory", "categories", "barcodes", "reorder-suggestions",
 "purchases", "purchase-orders", "warehouse", "challans",
 "printer-settings",
 ],
 field_agent: [],
};

// Ported 1:1 from shopkeeper-app/src/lib/moduleCategories.ts — same
// category color meaning must hold across both apps (design-system §6).
export const CATEGORY_COLORS: Record<string, string> = {
 billing: "#2E9E5B",
 inventory: "#375DFB",
 "purchases-warehouse": "#7C5CFC",
 accounting: "#B37400",
 staff: "#C24868",
 operations: "#1E8E85",
 settings: "#6B7280",
};
