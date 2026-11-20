import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { Budget, BudgetOverviewItem, Category } from '../../models/models';
import { BudgetDialogComponent } from '../../components/budget-dialog/budget-dialog.component';
import { formatMonth } from '../../utils/month.util';

@Component({
  selector: 'app-budgets',
  template: `
    <div class="main-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">Budgets</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Set and track monthly budgets by category</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <mat-form-field appearance="outline" style="min-width: 180px;">
            <mat-label>Month</mat-label>
            <mat-select [(value)]="selectedMonth" (selectionChange)="onMonthChange($event.value)">
              <mat-option *ngFor="let m of availableMonths" [value]="m.value">{{ m.label }}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="openBudgetDialog()">
            <mat-icon>add</mat-icon>
            Add Budget
          </button>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading budgets...</p>
      </div>

      <div *ngIf="!loading()">
        <!-- Summary Cards -->
        <div class="summary-grid" style="margin-bottom: 24px;">
          <div class="summary-card">
            <div class="summary-icon balance">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Total Budget</div>
              <div class="summary-value">{{ formatCurrency(budgetSummary().totalBudget) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon expense">
              <mat-icon>trending_down</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Total Spent</div>
              <div class="summary-value negative">{{ formatCurrency(budgetSummary().totalSpent) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" [style.background]="budgetSummary().totalRemaining >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'">
              <mat-icon>wallet</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Remaining</div>
              <div class="summary-value" [class.positive]="budgetSummary().totalRemaining >= 0" [class.negative]="budgetSummary().totalRemaining < 0">
                {{ formatCurrency(budgetSummary().totalRemaining) }}
              </div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" [style.background]="budgetSummary().overallPercentage <= 100 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'">
              <mat-icon>percent</mat-icon>
            </div>
            <div class="summary-content">
              <div class="summary-label">Budget Used</div>
              <div class="summary-value" [class.positive]="budgetSummary().overallPercentage <= 100" [class.negative]="budgetSummary().overallPercentage > 100">
                {{ budgetSummary().overallPercentage.toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>

        <!-- Budget List -->
        <div class="card">
          <div *ngIf="budgets().length === 0" class="empty-state" style="padding: 60px 20px;">
            <mat-icon class="empty-icon">account_balance</mat-icon>
            <h4 class="empty-title">No budgets set</h4>
            <p class="empty-message">Create budgets for your expense categories to track spending.</p>
            <button mat-raised-button color="primary" (click)="openBudgetDialog()">
              <mat-icon>add</mat-icon>
              Add Budget
            </button>
          </div>

          <div *ngIf="budgets().length > 0" class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budget</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let b of budgets()" [class.over-budget]="b.isOverBudget">
                  <td>
                    <span class="category-badge" [style.background-color]="b.category_color + '20'" [style.color]="b.category_color">
                      <span class="material-icons category-icon">{{ b.category_icon }}</span>
                      {{ b.category_name }}
                    </span>
                  </td>
                  <td>{{ formatCurrency(b.amount) }}</td>
                  <td>{{ formatCurrency(b.spent) }}</td>
                  <td [class]="b.remaining >= 0 ? 'amount-positive' : 'amount-negative'">
                    {{ formatCurrency(b.remaining) }}
                  </td>
                  <td style="min-width: 200px;">
                    <div class="budget-progress">
                      <div class="budget-progress-bar" [class]="getProgressClass(b.percentage)" [style.width.%]="Math.min(b.percentage, 100)"></div>
                    </div>
                    <div class="budget-info" [class.over]="b.isOverBudget">
                      <span>{{ b.percentage.toFixed(1) }}% used</span>
                      <span *ngIf="b.isOverBudget" style="color: #dc2626; font-weight: 600;">Over budget!</span>
                    </div>
                  </td>
                  <td>
                    <button mat-icon-button [matMenuTriggerFor]="actionMenu" aria-label="Actions">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #actionMenu="matMenu">
                      <button mat-menu-item (click)="openBudgetDialog(b)">
                        <mat-icon>edit</mat-icon>
                        <span>Edit</span>
                      </button>
                      <button mat-menu-item (click)="deleteBudget(b)">
                        <mat-icon style="color: #dc2626;">delete</mat-icon>
                        <span style="color: #dc2626;">Delete</span>
                      </button>
                    </mat-menu>
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

    .over-budget td {
      background: #fef2f2;
    }

    .budget-progress {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }

    .budget-progress-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease, background 0.3s ease;
    }

    .budget-progress-bar.normal {
      background: linear-gradient(90deg, #14b8a6, #0d9488);
    }

    .budget-progress-bar.warning {
      background: linear-gradient(90deg, #facc15, #eab308);
    }

    .budget-progress-bar.danger {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    .budget-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: #64748b;
      margin-top: 6px;
    }

    .budget-info.over {
      color: #dc2626;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .page-header > div:last-child {
        justify-content: space-between;
      }
    }
  `],
})
export class BudgetsComponent implements OnInit {
  readonly Math = Math;
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  selectedMonth = signal(this.getCurrentMonth());
  availableMonths = this.generateMonths();

  budgets = signal<BudgetOverviewItem[]>([]);
  budgetSummary = signal({ totalBudget: 0, totalSpent: 0, totalRemaining: 0, overallPercentage: 0 });
  expenseCategories = signal<Category[]>([]);

  ngOnInit() {
    this.loadExpenseCategories();
    this.loadBudgets();
  }

  onMonthChange(month: string) {
    this.selectedMonth.set(month);
    this.loadBudgets();
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

  loadExpenseCategories() {
    this.api.getCategories().subscribe({
      next: (res) => {
        this.expenseCategories.set(res.categories.filter(c => c.type === 'expense'));
      },
    });
  }

  loadBudgets() {
    this.loading.set(true);
    this.api.getBudgetOverview(this.selectedMonth()).subscribe({
      next: (res) => {
        this.budgets.set(res.overview);
        this.budgetSummary.set(res.summary);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load budgets', 'Close', { duration: 3000 });
      },
    });
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'normal';
  }

  openBudgetDialog(budget?: Budget) {
    const categories = this.expenseCategories();
    const availableCategories = budget
      ? categories
      : categories.filter(c => !this.budgets().some(b => b.category_id === c.id));

    if (availableCategories.length === 0 && !budget) {
      this.snackBar.open('All categories already have budgets for this month', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(BudgetDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { budget, categories: availableCategories, month: this.selectedMonth() },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadBudgets();
      }
    });
  }

  deleteBudget(budget: Budget) {
    if (confirm(`Delete budget for "${budget.category_name}"?`)) {
      this.api.deleteBudget(budget.id).subscribe({
        next: () => {
          this.snackBar.open('Budget deleted', 'Close', { duration: 3000 });
          this.loadBudgets();
        },
        error: () => {
          this.snackBar.open('Failed to delete budget', 'Close', { duration: 3000 });
        },
      });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }
}