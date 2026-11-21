import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CurrencyCode, CurrencySettings } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: Record<string, unknown>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params: httpParams });
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
  }

  patch<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }

  // Auth
  register(data: { email: string; password: string }) {
    return this.post<{ user: { id: number; email: string; display_currency: CurrencyCode }; token: string }>('/auth/register', data);
  }

  login(data: { email: string; password: string }) {
    return this.post<{ user: { id: number; email: string; display_currency: CurrencyCode }; token: string }>('/auth/login', data);
  }

  getCurrentUser() {
    return this.get<{ user: { id: number; email: string; created_at: string; display_currency: CurrencyCode } }>('/auth/me');
  }

  getCurrencySettings() {
    return this.get<CurrencySettings>('/settings');
  }

  updateDisplayCurrency(displayCurrency: CurrencyCode) {
    return this.put<Omit<CurrencySettings, 'supportedCurrencies'>>('/settings/currency', { displayCurrency });
  }

  // Categories
  getCategories() {
    return this.get<{ categories: Array<{ id: number; name: string; type: 'income' | 'expense'; color: string; icon: string; user_id?: number; is_default?: boolean }> }>('/categories');
  }

  getCategory(id: number) {
    return this.get<{ category: { id: number; name: string; type: string; color: string; icon: string; user_id?: number; is_default?: boolean } }>(`/categories/${id}`);
  }

  createCategory(data: { name: string; type: 'income' | 'expense'; color: string; icon: string }) {
    return this.post<{ category: { id: number; name: string; type: string; color: string; icon: string; user_id: number } }>('/categories', data);
  }

  updateCategory(id: number, data: Partial<{ name: string; type: 'income' | 'expense'; color: string; icon: string }>) {
    return this.put<{ category: { id: number; name: string; type: string; color: string; icon: string; user_id: number } }>(`/categories/${id}`, data);
  }

  deleteCategory(id: number) {
    return this.delete<{ success: boolean }>(`/categories/${id}`);
  }

  // Transactions
  getTransactions(params: {
    page?: number;
    limit?: number;
    type?: 'income' | 'expense';
    category_id?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
    sort_by?: 'date' | 'type' | 'amount';
    sort_order?: 'asc' | 'desc';
  }) {
    return this.get<{
      transactions: Array<{
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        displayAmount: number;
        displayCurrency: CurrencyCode;
        conversionRate: number;
        type: 'income' | 'expense';
        description?: string;
        date: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        category_type: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/transactions', params);
  }

  getTransaction(id: number) {
    return this.get<{
      transaction: {
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        type: 'income' | 'expense';
        description?: string;
        date: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        category_type: string;
      };
    }>(`/transactions/${id}`);
  }

  createTransaction(data: {
    category_id: number;
    amount: number;
    currency?: CurrencyCode;
    type: 'income' | 'expense';
    description?: string;
    date: string;
  }) {
    return this.post<{
      transaction: {
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        type: 'income' | 'expense';
        description?: string;
        date: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        category_type: string;
      };
    }>('/transactions', data);
  }

  updateTransaction(id: number, data: Partial<{
    category_id: number;
    amount: number;
    currency?: CurrencyCode;
    type: 'income' | 'expense';
    description?: string;
    date: string;
  }>) {
    return this.put<{
      transaction: {
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        type: 'income' | 'expense';
        description?: string;
        date: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        category_type: string;
      };
    }>(`/transactions/${id}`, data);
  }

  deleteTransaction(id: number) {
    return this.delete<{ success: boolean }>(`/transactions/${id}`);
  }

  importTransactions(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: number; failed: number; errors: string[] }>(`${this.baseUrl}/transactions/import`, formData);
  }

  // Budgets
  getBudgets(month: string) {
    return this.get<{
      budgets: Array<{
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        displayAmount: number;
        displayCurrency: CurrencyCode;
        month: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
      }>;
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/budgets', { month });
  }

  getBudgetOverview(month: string) {
    return this.get<{
      overview: Array<{
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        month: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        spent: number;
        remaining: number;
        displayAmount: number;
        displaySpent: number;
        displayRemaining: number;
        displayCurrency: CurrencyCode;
        conversionRate: number;
        percentage: number;
        isOverBudget: boolean;
      }>;
      summary: {
        totalBudget: number;
        totalSpent: number;
        totalRemaining: number;
        overallPercentage: number;
      };
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/budgets/overview', { month });
  }

  createOrUpdateBudget(data: {
    category_id: number;
    amount: number;
    month: string;
    currency?: CurrencyCode;
  }) {
    return this.post<{
      budget: {
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        month: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
      };
    }>('/budgets', data);
  }

  updateBudget(id: number, amount: number, currency?: CurrencyCode) {
    return this.put<{
      budget: {
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        month: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
      };
    }>(`/budgets/${id}`, { amount, currency });
  }

  deleteBudget(id: number) {
    return this.delete<{ success: boolean }>(`/budgets/${id}`);
  }

  // Dashboard
  getDashboardSummary(month?: string) {
    return this.get<{
      summary: {
        income: number;
        expenses: number;
        balance: number;
        savingsRate: number;
      };
      recentTransactions: Array<{
        id: number;
        user_id: number;
        category_id: number;
        amount: number;
        currency: CurrencyCode;
        displayAmount: number;
        displayCurrency: CurrencyCode;
        conversionRate: number;
        type: 'income' | 'expense';
        description?: string;
        date: string;
        created_at: string;
        category_name: string;
        category_color: string;
        category_icon: string;
        category_type: string;
      }>;
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/dashboard/summary', month ? { month } : {});
  }

  getSpendingByCategory(month?: string) {
    return this.get<{
      data: Array<{
        id: number;
        name: string;
        color: string;
        icon: string;
        total: number;
        percentage: number;
      }>;
      total: number;
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/dashboard/spending-by-category', month ? { month } : {});
  }

  getMonthlyTrend(months = 6) {
    return this.get<{
      trend: Array<{
        month: string;
        income: number;
        expenses: number;
      }>;
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/dashboard/monthly-trend', { months });
  }

  getIncomeVsExpense(month?: string) {
    return this.get<{
      income: number;
      expenses: number;
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/dashboard/income-vs-expense', month ? { month } : {});
  }

  getTopCategories(month?: string, limit = 5) {
    return this.get<{
      topCategories: Array<{
        id: number;
        name: string;
        color: string;
        icon: string;
        total: number;
      }>;
      displayCurrency: CurrencyCode;
      conversionRates: Array<{ from: CurrencyCode; to: CurrencyCode; rate: number }>;
      ratesUpdatedAt: string | null;
    }>('/dashboard/top-categories', month ? { month, limit } : { limit });
  }
}