export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  role: UserRole;
  company_id?: string;
  is_active?: boolean;
  created_at: string;
}

export type UserRole = "owner" | "manager" | "staff" | "warehouse_manager" | "field_agent";

export interface Company {
  id: string;
  name: string;
  state?: string;
  gstin?: string;
  address?: string;
  phone?: string;
  onboarding_completed_at?: string;
  enabled_modules?: string[];
  created_at: string;
}

export interface DashboardKpi {
  sales_today: number;
  invoices_today: number;
  cash_total: number;
  upi_total: number;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  unit?: string;
  mrp?: number;
  price?: number;
  tax_rate?: number;
  stock_quantity: number;
  reorder_level?: number;
  barcode?: string;
  created_at: string;
}

export interface Party {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
  type: "customer" | "supplier";
  current_balance: number;
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  date: string;
  type: "debit" | "credit";
  amount: number;
  reference?: string;
  party?: { id: string; name: string; type: string };
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  date: string;
  grand_total: number;
  amount_paid: number;
  payment_status: string;
  party?: { name: string };
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
  };
}
