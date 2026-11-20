import { Component, OnInit } from '@angular/core';
import { Chart, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ApiService } from '../../services/api.service';
import { Transaction, SpendingByCategory, MonthlyTrend } from '../../models/models';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="main-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Welcome back! Here's your financial overview.</p>
        </div>
        <mat-form-field appearance="outline" style="min-width: 180px;">
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

        <!-- Charts Row -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
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

          <!-- Monthly Trend - Bar Chart -->
          <div class="chart-container">
            <h3 class="chart-title">6-Month Trend</h3>
            <div *ngIf="trendData.length === 0" class="empty-state">
              <mat-icon class="empty-icon">show_chart</mat-icon>
              <h4 class="empty-title">No trend data</h4>
              <p class="empty-message">Add transactions to see your monthly trends.</p>
            </div>
            <div *ngIf="trendData.length > 0" style="height: 300px;">
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
                      {{ t.type === 'income' ? '+' : '-' }}{{ formatCurrency(t.amount) }}
                    </span>
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

    @media (max-width: 900px) {
      .charts-row {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  loading = true;
  selectedMonth = '';
  availableMonths: { value: string; label: string }[] = [];

  summary = { income: 0, expenses: 0, balance: 0, savingsRate: 0 };
  recentTransactions: Transaction[] = [];
  spendingData: SpendingByCategory[] = [];
  trendData: MonthlyTrend[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
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
      },
      error: () => {
        this.loading = false;
      },
    });

    this.api.getSpendingByCategory(this.selectedMonth).subscribe({
      next: (res) => {
        this.spendingData = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.api.getMonthlyTrend(6).subscribe({
      next: (res) => {
        this.trendData = res.trend;
      },
    });
  }

  getCurrentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  generateMonths(): { value: string; label: string }[] {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
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
      labels: data.map(d => {
        const [year, month] = d.month.split('-');
        return new Date(+year, +month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      datasets: [
        {
          label: 'Income',
          data: data.map(d => d.income),
          backgroundColor: '#10b981',
          borderRadius: 6,
          maxBarThickness: 40,
        },
        {
          label: 'Expenses',
          data: data.map(d => d.expenses),
          backgroundColor: '#ef4444',
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
        grid: { color: '#e2e8f0' },
        ticks: {
          font: { size: 11, family: 'Inter' },
          callback: (value: string | number) => this.formatCurrency(Number(value)).replace(/\.00$/, ''),
        },
      },
    },
  };
}