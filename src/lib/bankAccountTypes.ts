// Split out of shopkeeper-app/app/bank-accounts.tsx's inline `BankAccount`
// type — ledger.tsx needs the shape for typing a payment-mode API response,
// but the Bank Accounts *screen* itself is an Owner-only web-parity feature
// (shopkeeper-app/app/bank-accounts.tsx) that doesn't belong in this app's
// Cashier/Store Manager/Warehouse Manager scope.
export interface BankAccount {
  id: string;
  account_name: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  opening_balance: string;
  current_balance: string;
}
