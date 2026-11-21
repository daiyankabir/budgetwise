import { Component, DestroyRef, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { CurrencyConversionRate, Transaction, SpendingByCategory, TrendPeriod, TrendPoint } from '../../models/models';
import { formatMonth } from '../../utils/month.util';
import { CurrencyService } from '../../services/currency.service';
import { formatCurrency as formatCurrencyValue, formatExchangeRate } from '../../utils/currency.util';
import { ThemeService } from '../../services/theme.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="main-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Monthly income, expenses, and balance</p>
        </div>
        <mat-form-field appearance="outline" class="month-select" subscriptSizing="dynamic">
          <mat-label>Month</mat-label>
          <mat-select [(value)]="selectedMonth" (selectionChange)="onMonthChange($event.value)">
            <mat-option *ngFor="let m of availableMonths" [value]="m.value">{{ m.label }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading dashboard...</p>
      </div>

      <div *ngIf="!loading" class="dashboard-content">
        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon income">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Income</div>
              <div class="summary-value positive">{{ formatCurrency(summary.income) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon expense">
              <mat-icon>trending_down</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Expenses</div>
              <div class="summary-value negative">{{ formatCurrency(summary.expenses) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon balance">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Balance</div>
              <div class="summary-value" [class.positive]="summary.balance >= 0" [class.negative]="summary.balance < 0">
                {{ formatCurrency(summary.balance) }}
              </div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon savings">
              <mat-icon>savings</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Savings Rate</div>
              <div class="summary-value">{{ summary.savingsRate.toFixed(1) }}%</div>
            </div>
          </div>
        </div>

        <div class="exchange-rate-note" *ngIf="displayConversionRates.length > 0">
          Latest rates:
          <span *ngFor="let rate of displayConversionRates; let last = last">
            1 {{ rate.from }} = {{ formatExchangeRate(rate.rate) }} {{ rate.to }}<span *ngIf="!last"> · </span>
          </span>
          <span *ngIf="ratesUpdatedAt"> (updated {{ ratesUpdatedAt }})</span>
        </div>

        <!-- Charts Row -->
        <div class="charts-grid">
          <!-- Spending by Category - Doughnut Chart -->
          <div class="chart-container">
            <h3 class="chart-title">Spending by Category</h3>
            <div *ngIf="spendingData.length === 0" class="empty-state">
              <mat-icon class="empty-icon">pie_chart</mat-icon>
              <h4 class="empty-title">No spending data</h4>
              <p class="empty-message">Add expense transactions to see your spending breakdown.</p>
            </div>
            <div *ngIf="spendingData.length > 0" style="height: 300px;">
              <canvas baseChart
                [data]="doughnutChartData"
                [options]="doughnutChartOptions"
                [type]="'doughnut'">
              </canvas>
            </div>
          </div>

          <!-- Transaction Trend - Bar Chart -->
          <div class="chart-container">
            <div class="trend-chart-header">
              <h3 class="chart-title">Transaction trend</h3>
              <mat-select
                class="trend-period-select"
                panelClass="trend-period-panel"
                aria-label="Trend period"
                [value]="trendPeriod"
                (selectionChange)="onTrendPeriodChange($event.value)">
                <mat-option *ngFor="let option of trendPeriods" [value]="option.value">
                  {{ option.label }}
                </mat-option>
              </mat-select>
            </div>
            <div *ngIf="!hasTrendTransactions" class="empty-state">
              <mat-icon class="empty-icon">show_chart</mat-icon>
              <h4 class="empty-title">No transactions in this period</h4>
              <p class="empty-message">Try a longer range or add transactions in this period.</p>
            </div>
            <div *ngIf="hasTrendTransactions" style="height: 300px;">
              <canvas baseChart
                [data]="barChartData"
                [options]="barChartOptions"
                [type]="'bar'">
              </canvas>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Transactions</h3>
            <a mat-button routerLink="/transactions" color="primary">View All</a>
          </div>
          <div *ngIf="recentTransactions.length === 0" class="empty-state">
            <mat-icon class="empty-icon">receipt_long</mat-icon>
            <h4 class="empty-title">No transactions yet</h4>
            <p class="empty-message">Add your first transaction to get started.</p>
            <a mat-raised-button color="primary" routerLink="/transactions">Add Transaction</a>
          </div>
          <div *ngIf="recentTransactions.length > 0" class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th class="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of recentTransactions">
                  <td>{{ formatDate(t.date) }}</td>
                  <td>
                    <span class="category-badge" [style.background-color]="t.category_color + '20'" [style.color]="t.category_color">
                      <span class="material-icons category-icon">{{ t.category_icon }}</span>
                      {{ t.category_name }}
                    </span>
                  </td>
                  <td>{{ t.description || '—' }}</td>
                  <td class="amount-col">
                    <span [class]="t.type === 'income' ? 'amount-positive' : 'amount-negative'">
                      {{ t.type === 'income' ? '+' : '-' }}{{ formatCurrency(t.displayAmount ?? t.amount) }}
                    </span>
                    <small class="conversion-note" *ngIf="t.currency !== currencyService.displayCurrency()">
                      1 {{ t.currency }} = {{ formatExchangeRate(t.conversionRate ?? 1) }} {{ currencyService.displayCurrency() }}
                    </small>
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
      color: var(--text-muted);
    }

    .dashboard-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .amount-col {
      text-align: right;
      white-space: nowrap;
    }

    .conversion-note {
      display: block;
      margin-top: 2px;
      color: var(--text-muted);
      font-size: 0.7rem;
    }

    .exchange-rate-note {
      margin: -12px 0 24px;
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .trend-chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }

    .trend-chart-header .chart-title {
      margin: 0;
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

    @media (max-width: 900px) {
      .charts-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  @ViewChildren(BaseChartDirective) charts!: QueryList<BaseChartDirective>;

  private destroyRef = inject(DestroyRef);
  public currencyService = inject(CurrencyService);
  public themeService = inject(ThemeService);
  readonly formatExchangeRate = formatExchangeRate;
  loading = true;
  selectedMonth = '';
  availableMonths: { value: string; label: string }[] = [];
  trendPeriod: TrendPeriod = '30d';
  trendPeriods: Array<{ value: TrendPeriod; label: string }> = [
    { value: '7d', label: '1 week' },
    { value: '15d', label: '15 days' },
    { value: '30d', label: '30 days' },
    { value: '3m', label: '3 months' },
  ];

  summary = { income: 0, expenses: 0, balance: 0, savingsRate: 0 };
  recentTransactions: Transaction[] = [];
  spendingData: SpendingByCategory[] = [];
  trendData: TrendPoint[] = [];
  conversionRates: CurrencyConversionRate[] = [];
  ratesUpdatedAt: string | null = null;

  constructor(private api: ApiService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.currencyService.currencyChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDashboard());
    this.themeService.themeChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.charts?.forEach((chart) => chart.update()));
    this.selectedMonth = this.getCurrentMonth();
    this.availableMonths = this.generateMonths();
    this.loadDashboard();
  }

  onMonthChange(month: string) {
    this.selectedMonth = month;
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;

    this.api.getDashboardSummary(this.selectedMonth).subscribe({
      next: (res) => {
        this.summary = res.summary;
        this.recentTransactions = res.recentTransactions;
        this.conversionRates = res.conversionRates;
        this.ratesUpdatedAt = res.ratesUpdatedAt;
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(error?.error?.error || 'Failed to load dashboard summary', 'Close', { duration: 4000 });
      },
    });

    this.api.getSpendingByCategory(this.selectedMonth).subscribe({
      next: (res) => {
        this.spendingData = res.data;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(error?.error?.error || 'Failed to load spending data', 'Close', { duration: 4000 });
      },
    });

    this.loadTrend();
  }

  onTrendPeriodChange(period: TrendPeriod) {
    this.trendPeriod = period;
    this.loadTrend();
  }

  loadTrend() {
    this.api.getTrend(this.trendPeriod).subscribe({
      next: (res) => {
        this.trendData = res.trend;
      },
      error: (error) => {
        this.snackBar.open(error?.error?.error || 'Failed to load transaction trend', 'Close', { duration: 4000 });
      },
    });
  }

  get hasTrendTransactions(): boolean {
    return this.trendData.some((point) => point.income > 0 || point.expenses > 0);
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

  formatCurrency(amount: number): string {
    return formatCurrencyValue(amount, this.currencyService.displayCurrency());
  }

  get displayConversionRates(): CurrencyConversionRate[] {
    return this.conversionRates.filter((rate) => rate.from !== rate.to);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Doughnut Chart
  get doughnutChartData() {
    const data = this.spendingData;
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
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 12, family: 'Inter' },
        },
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

  // Bar Chart
  get barChartData() {
    const data = this.trendData;
    return {
      labels: data.map((point) => {
        const date = new Date(`${point.period}T00:00:00`);
        return this.trendPeriod === '3m'
          ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Income',
          data: data.map((point) => point.income),
          backgroundColor: this.themeService.palette().income,
          borderRadius: 6,
          maxBarThickness: 40,
        },
        {
          label: 'Expenses',
          data: data.map((point) => point.expenses),
          backgroundColor: this.themeService.palette().expense,
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    };
  }

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          font: { size: 12, family: 'Inter' },
        },
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
        grid: { color: () => this.themeService.palette().border },
        ticks: {
          font: { size: 11, family: 'Inter' },
          callback: (value: string | number) => this.formatCurrency(Number(value)).replace(/\.00$/, ''),
        },
      },
    },
  };
}