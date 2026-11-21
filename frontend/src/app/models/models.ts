export type CurrencyCode = 'USD' | 'BDT' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY';

export interface User {
  id: number;
  email: string;
  display_currency?: CurrencyCode;
  created_at?: string;
}

export interface CurrencyConversionRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
}

export interface CurrencySettings {
  displayCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  exchangeRate: CurrencyConversionRate;
  ratesUpdatedAt: string | null;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  user_id?: number;
  is_default?: boolean;
}

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  currency: CurrencyCode;
  displayAmount?: number;
  displayCurrency?: CurrencyCode;
  conversionRate?: number;
  type: 'income' | 'expense';
  description?: string;
  date: string;
  created_at: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  category_type?: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  currency: CurrencyCode;
  displayAmount?: number;
  displaySpent?: number;
  displayRemaining?: number;
  displayCurrency?: CurrencyCode;
  conversionRate?: number;
  month: string;
  created_at: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  spent?: number;
  remaining?: number;
  percentage?: number;
  isOverBudget?: boolean;
}

export interface BudgetOverviewItem extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface DashboardSummary {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
}

export interface SpendingByCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}

export interface IncomeVsExpense {
  income: number;
  expenses: number;
}

export interface TopCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  total: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  category_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?: 'date' | 'type' | 'amount';
  sort_order?: 'asc' | 'desc';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface BudgetOverview {
  overview: BudgetOverviewItem[];
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    overallPercentage: number;
  };
}