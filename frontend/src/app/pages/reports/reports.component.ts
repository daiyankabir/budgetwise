import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, ChartOptions, registerables } from 'chart.js';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { CurrencyConversionRate, SpendingByCategory, MonthlyTrend, TopCategory } from '../../models/models';
import { formatMonth } from '../../utils/month.util';
import { CurrencyService } from '../../services/currency.service';
import { formatCurrency as formatCurrencyValue, formatExchangeRate } from '../../utils/currency.util';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  template: `
    <div class="main-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Analyze your financial patterns and trends</p>
        </div>
        <mat-form-field appearance="outline" style="min-width: 180px;">
          <mat-label>Month</mat-label>
          <mat-select [(value)]="selectedMonth" (selectionChange)="onMonthChange($event.value)">
            <mat-option *ngFor="let m of availableMonths" [value]="m.value">{{ m.label }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="exchange-rate-note" *ngIf="displayConversionRates.length > 0">
        Latest rates:
        <span *ngFor="let rate of displayConversionRates; let last = last">
          1 {{ rate.from }} = {{ formatExchangeRate(rate.rate) }} {{ rate.to }}<span *ngIf="!last"> · </span>
        </span>
        <span *ngIf="ratesUpdatedAt"> (updated {{ ratesUpdatedAt }})</span>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading reports...</p>
      </div>

      <div *ngIf="!loading()" class="reports-content">
        <!-- Key Metrics -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon income">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Total Income</div>
              <div class="summary-value positive">{{ formatCurrency(incomeVsExpense().income) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon expense">
              <mat-icon>trending_down</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Total Expenses</div>
              <div class="summary-value negative">{{ formatCurrency(incomeVsExpense().expenses) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon balance">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Net Savings</div>
              <div class="summary-value" [class.positive]="netSavings() >= 0" [class.negative]="netSavings() < 0">
                {{ formatCurrency(netSavings()) }}
              </div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon savings">
              <mat-icon>savings</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Savings Rate</div>
              <div class="summary-value" [class.positive]="savingsRate() >= 0" [class.negative]="savingsRate() < 0">
                {{ savingsRate().toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Row 1 -->
        <div class="charts-grid">
          <!-- Income vs Expense - Horizontal Bar -->
          <div class="chart-container">
            <h3 class="chart-title">Income vs Expenses</h3>
            <div style="height: 200px;">
              <canvas baseChart
                [data]="incomeExpenseChartData"
                [options]="horizontalBarChartOptions"
                [type]="'bar'">
              </canvas>
            </div>
          </div>

          <!-- Top Categories - Horizontal Bar -->
          <div class="chart-container">
            <h3 class="chart-title">Top Spending Categories</h3>
            <div *ngIf="topCategories().length === 0" class="empty-state" style="height: 200px;">
              <mat-icon class="empty-icon">leaderboard</mat-icon>
              <h4 class="empty-title">No spending data</h4>
              <p class="empty-message">Add expense transactions to see top categories.</p>
            </div>
            <div *ngIf="topCategories().length > 0" style="height: 200px;">
              <canvas baseChart
                [data]="topCategoriesChartData"
                [options]="horizontalBarChartOptions"
                [type]="'bar'">
              </canvas>
            </div>
          </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="charts-grid">
          <!-- Monthly Trend -->
          <div class="chart-container">
            <h3 class="chart-title">Monthly Trend (6 Months)</h3>
            <div *ngIf="monthlyTrend().length === 0" class="empty-state" style="height: 300px;">
              <mat-icon class="empty-icon">show_chart</mat-icon>
              <h4 class="empty-title">No trend data</h4>
              <p class="empty-message">Add transactions over time to see trends.</p>
            </div>
            <div *ngIf="monthlyTrend().length > 0" style="height: 300px;">
              <canvas baseChart
                [data]="monthlyTrendChartData"
                [options]="monthlyTrendChartOptions"
                [type]="'line'">
              </canvas>
            </div>
          </div>

          <!-- Spending by Category - Doughnut -->
          <div class="chart-container">
            <h3 class="chart-title">Spending Breakdown</h3>
            <div *ngIf="spendingByCategory().length === 0" class="empty-state" style="height: 300px;">
              <mat-icon class="empty-icon">pie_chart</mat-icon>
              <h4 class="empty-title">No spending data</h4>
              <p class="empty-message">Add expense transactions to see breakdown.</p>
            </div>
            <div *ngIf="spendingByCategory().length > 0" style="height: 300px;">
              <canvas baseChart
                [data]="spendingDoughnutChartData"
                [options]="doughnutChartOptions"
                [type]="'doughnut'">
              </canvas>
            </div>
          </div>
        </div>

        <!-- Category Details Table -->
        <div class="card">
          <h3 class="card-title">Category Details</h3>
          <div *ngIf="spendingByCategory().length === 0" class="empty-state">
            <mat-icon class="empty-icon">table_chart</mat-icon>
            <h4 class="empty-title">No data available</h4>
          </div>
          <div *ngIf="spendingByCategory().length > 0" class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cat of spendingByCategory()">
                  <td>
                    <span class="category-badge" [style.background-color]="cat.color + '20'" [style.color]="cat.color">
                      <span class="material-icons category-icon">{{ cat.icon }}</span>
                      {{ cat.name }}
                    </span>
                  </td>
                  <td>{{ formatCurrency(cat.total) }}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: {{ cat.percentage }}%; background: {{ cat.color }}; border-radius: 3px; transition: width 0.3s ease;"></div>
                      </div>
                      <span style="font-weight: 500; min-width: 50px;">{{ cat.percentage.toFixed(1) }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;
      color: #64748b;
    }

    .reports-content {
      animation: fadeIn 0.3s ease;
    }

    .exchange-rate-note {
      margin: -12px 0 24px;
      color: #64748b;
      font-size: 0.8rem;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .charts-grid > * {
      min-width: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .category-icon {
      font-size: 0.875rem;
    }

    @media (max-width: 900px) {
      .charts-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `],
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  public currencyService = inject(CurrencyService);
  readonly formatExchangeRate = formatExchangeRate;

  loading = signal(true);
  selectedMonth = signal(this.getCurrentMonth());
  availableMonths = this.generateMonths();

  incomeVsExpense = signal({ income: 0, expenses: 0 });
  spendingByCategory = signal<SpendingByCategory[]>([]);
  monthlyTrend = signal<MonthlyTrend[]>([]);
  topCategories = signal<TopCategory[]>([]);
  conversionRates: CurrencyConversionRate[] = [];
  ratesUpdatedAt: string | null = null;

  netSavings = computed(() => this.incomeVsExpense().income - this.incomeVsExpense().expenses);
  savingsRate = computed(() => {
    const income = this.incomeVsExpense().income;
    return income > 0 ? ((income - this.incomeVsExpense().expenses) / income) * 100 : 0;
  });

  ngOnInit() {
    this.currencyService.currencyChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadReports());
    this.loadReports();
  }

  onMonthChange(month: string) {
    this.selectedMonth.set(month);
    this.loadReports();
  }

  getCurrentMonth(): string {
    return formatMonth(new Date());
  }

  generateMonths(): { value: string; label: string }[] {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = formatMonth(d);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  }

  loadReports() {
    this.loading.set(true);

    this.api.getIncomeVsExpense(this.selectedMonth()).subscribe({
      next: (res) => {
        this.incomeVsExpense.set(res);
        this.conversionRates = res.conversionRates;
        this.ratesUpdatedAt = res.ratesUpdatedAt;
      },
      error: (error) => {
        this.snackBar.open(error?.error?.error || 'Failed to load income and expense totals', 'Close', { duration: 4000 });
      },
    });

    this.api.getSpendingByCategory(this.selectedMonth()).subscribe({
      next: (res) => {
        this.spendingByCategory.set(res.data);
      },
      error: (error) => {
        this.snackBar.open(error?.error?.error || 'Failed to load category spending', 'Close', { duration: 4000 });
      },
    });

    this.api.getMonthlyTrend(6).subscribe({
      next: (res) => {
        this.monthlyTrend.set(res.trend);
      },
      error: (error) => {
        this.snackBar.open(error?.error?.error || 'Failed to load monthly trend', 'Close', { duration: 4000 });
      },
    });

    this.api.getTopCategories(this.selectedMonth(), 10).subscribe({
      next: (res) => {
        this.topCategories.set(res.topCategories);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open(error?.error?.error || 'Failed to load top categories', 'Close', { duration: 4000 });
      },
    });
  }

  formatCurrency(amount: number): string {
    return formatCurrencyValue(amount, this.currencyService.displayCurrency());
  }

  get displayConversionRates(): CurrencyConversionRate[] {
    return this.conversionRates.filter((rate) => rate.from !== rate.to);
  }

  // Income vs Expense Horizontal Bar Chart
  get incomeExpenseChartData() {
    const data = this.incomeVsExpense();
    return {
      labels: ['Income', 'Expenses'],
      datasets: [
        {
          label: 'Amount',
          data: [data.income, data.expenses],
          backgroundColor: ['#10b981', '#ef4444'],
          borderRadius: 6,
          maxBarThickness: 60,
        },
      ],
    };
  }

  // Top Categories Horizontal Bar Chart
  get topCategoriesChartData() {
    const data = this.topCategories().slice(0, 8).reverse();
    return {
      labels: data.map(d => d.name),
      datasets: [
        {
          label: 'Spending',
          data: data.map(d => d.total),
          backgroundColor: data.map(d => d.color),
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    };
  }

  horizontalBarChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: {
          font: { size: 11, family: 'Inter' },
          callback: (value: string | number) => this.formatCurrency(Number(value)).replace(/\.00$/, ''),
        },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter' } },
      },
    },
  };

  // Monthly Trend Line Chart
  get monthlyTrendChartData() {
    const data = this.monthlyTrend();
    return {
      labels: data.map(d => {
        const [year, month] = d.month.split('-');
        return new Date(+year, +month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      datasets: [
        {
          label: 'Income',
          data: data.map(d => d.income),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Expenses',
          data: data.map(d => d.expenses),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }

  monthlyTrendChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12, family: 'Inter' } },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter' } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: {
          font: { size: 11, family: 'Inter' },
          callback: (value: string | number) => this.formatCurrency(Number(value)).replace(/\.00$/, ''),
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  // Spending Doughnut Chart
  get spendingDoughnutChartData() {
    const data = this.spendingByCategory();
    return {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.total),
        backgroundColor: data.map(d => d.color),
        borderWidth: 0,
        hoverOffset: 8,
      }],
    };
  }

  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12, family: 'Inter' } },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '65%',
  };
}