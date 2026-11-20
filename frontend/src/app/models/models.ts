export interface User {
  id: number;
  email: string;
  created_at?: string;
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
  overview: Budget[];
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    overallPercentage: number;
  };
}