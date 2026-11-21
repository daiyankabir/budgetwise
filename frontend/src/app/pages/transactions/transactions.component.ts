import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { merge, Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Transaction, Category, TransactionQueryParams } from '../../models/models';
import { TransactionDialogComponent } from '../../components/transaction-dialog/transaction-dialog.component';
import { CurrencyService } from '../../services/currency.service';
import { formatCurrency as formatCurrencyValue, formatExchangeRate } from '../../utils/currency.util';

@Component({
  selector: 'app-transactions',
  template: `
    <div class="main-content">
      <div class="page-header">
        <div>
          <h1 class="page-title">Transactions</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Manage your income and expenses</p>
        </div>
        <button mat-raised-button color="primary" (click)="openDialog()">
          <mat-icon>add</mat-icon>
          Add Transaction
        </button>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Search</label>
          <input type="text" class="form-input" [formControl]="searchControl" placeholder="Search description...">
        </div>
        <div class="filter-group">
          <label class="filter-label">Type</label>
          <select class="filter-select" [formControl]="typeControl">
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Category</label>
          <select class="filter-select" [formControl]="categoryControl">
            <option value="">All Categories</option>
            <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">From Date</label>
          <input type="date" class="form-input" [formControl]="startDateControl">
        </div>
        <div class="filter-group">
          <label class="filter-label">To Date</label>
          <input type="date" class="form-input" [formControl]="endDateControl">
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <div *ngIf="loading()" class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!loading() && transactions().length === 0" class="empty-state" style="padding: 60px 20px;">
          <mat-icon class="empty-icon">receipt_long</mat-icon>
          <h4 class="empty-title">No transactions found</h4>
          <p class="empty-message">{{ hasFilters() ? 'Try adjusting your filters' : 'Add your first transaction to get started' }}</p>
          <button mat-raised-button color="primary" (click)="openDialog()" *ngIf="!hasFilters()">
            <mat-icon>add</mat-icon>
            Add Transaction
          </button>
        </div>

        <div *ngIf="!loading() && transactions().length > 0" class="table-responsive">
          <table mat-table [dataSource]="transactions()" matSort [matSortActive]="sortBy()" [matSortDirection]="sortDirection()" (matSortChange)="onSortChange($event)">
            <!-- Date Column -->
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
              <td mat-cell *matCellDef="let t">{{ formatDate(t.date) }}</td>
            </ng-container>

            <!-- Category Column -->
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let t">
                <span class="category-badge" [style.background-color]="t.category_color + '20'" [style.color]="t.category_color">
                  <span class="material-icons category-icon">{{ t.category_icon }}</span>
                  {{ t.category_name }}
                </span>
              </td>
            </ng-container>

            <!-- Type Column -->
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
              <td mat-cell *matCellDef="let t">
                <span class="category-badge" [style.background-color]="t.type === 'income' ? '#d1fae5' : '#fee2e2'" [style.color]="t.type === 'income' ? '#059669' : '#dc2626'">
                  {{ t.type === 'income' ? 'Income' : 'Expense' }}
                </span>
              </td>
            </ng-container>

            <!-- Description Column -->
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let t">{{ t.description || '—' }}</td>
            </ng-container>

            <!-- Amount Column -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="amount-col">Amount</th>
              <td mat-cell *matCellDef="let t" class="amount-col">
                <span [class]="t.type === 'income' ? 'amount-positive' : 'amount-negative'">
                  {{ t.type === 'income' ? '+' : '-' }}{{ formatCurrency(t.displayAmount ?? t.amount, currencyService.displayCurrency()) }}
                </span>
                <small class="conversion-note" *ngIf="t.currency !== currencyService.displayCurrency()">
                  1 {{ t.currency }} = {{ formatExchangeRate(t.conversionRate ?? 1) }} {{ currencyService.displayCurrency() }}
                </small>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let t">
                <button mat-icon-button [matMenuTriggerFor]="actionMenu" aria-label="Actions">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #actionMenu="matMenu">
                  <button mat-menu-item (click)="openDialog(t)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="deleteTransaction(t)">
                    <mat-icon style="color: #dc2626;">delete</mat-icon>
                    <span style="color: #dc2626;">Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="!loading() && transactions().length > 0" class="pagination">
          <button mat-button class="pagination-btn" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <span class="pagination-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
          <button mat-button class="pagination-btn" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages()">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .amount-col {
      text-align: right;
      white-space: nowrap;
    }

    .conversion-note {
      display: block;
      margin-top: 2px;
      color: #64748b;
      font-size: 0.7rem;
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

    @media (max-width: 768px) {
      .filter-bar {
        flex-direction: column;
      }

      .filter-group {
        min-width: 100%;
      }
    }
  `],
})
export class TransactionsComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  public currencyService = inject(CurrencyService);
  readonly formatExchangeRate = formatExchangeRate;

  displayedColumns = ['date', 'category', 'type', 'description', 'amount', 'actions'];
  transactions = signal<Transaction[]>([]);
  loading = signal(true);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);

  categories = signal<Category[]>([]);
  sortBy = signal<'date' | 'type' | 'amount'>('date');
  sortDirection = signal<'asc' | 'desc'>('desc');

  searchControl = new FormControl('');
  typeControl = new FormControl<'income' | 'expense' | ''>('');
  categoryControl = new FormControl<number | ''>('');
  startDateControl = new FormControl('');
  endDateControl = new FormControl('');

  ngOnInit() {
    this.currencyService.currencyChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadTransactions());
    this.loadCategories();
    this.setupFilters();
    this.loadTransactions();
  }

  loadCategories() {
    this.api.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.categories);
      },
    });
  }

  setupFilters() {
    merge(
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.typeControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.categoryControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.startDateControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.endDateControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
    ).subscribe(() => {
      this.currentPage.set(1);
      this.loadTransactions();
    });
  }

  hasFilters(): boolean {
    return !!(
      this.searchControl.value ||
      this.typeControl.value ||
      this.categoryControl.value ||
      this.startDateControl.value ||
      this.endDateControl.value
    );
  }

  loadTransactions() {
    this.loading.set(true);
    const params: TransactionQueryParams = {
      page: this.currentPage(),
      limit: 20,
      search: this.searchControl.value || undefined,
      type: this.typeControl.value || undefined,
      category_id: this.categoryControl.value || undefined,
      start_date: this.startDateControl.value || undefined,
      end_date: this.endDateControl.value || undefined,
      sort_by: this.sortBy(),
      sort_order: this.sortDirection(),
    };

    this.api.getTransactions(params).subscribe({
      next: (res) => {
        this.transactions.set(res.transactions);
        this.totalPages.set(res.pagination.totalPages);
        this.totalItems.set(res.pagination.total);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open(error?.error?.error || 'Failed to load transactions', 'Close', { duration: 4000 });
      },
    });
  }

  onSortChange(sort: Sort) {
    if (!sort.direction) {
      this.sortBy.set('date');
      this.sortDirection.set('desc');
    } else {
      switch (sort.active) {
        case 'date':
        case 'type':
        case 'amount':
          this.sortBy.set(sort.active);
          this.sortDirection.set(sort.direction);
          break;
        default:
          return;
      }
    }
    this.currentPage.set(1);
    this.loadTransactions();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadTransactions();
    }
  }

  openDialog(transaction?: Transaction) {
    const categories$ = this.api.getCategories();

    categories$.subscribe({
      next: (res) => {
        const dialogRef = this.dialog.open(TransactionDialogComponent, {
          width: '500px',
          maxWidth: '90vw',
          data: {
            transaction,
            categories: res.categories,
            displayCurrency: this.currencyService.displayCurrency(),
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.loadTransactions();
          }
        });
      },
    });
  }

  deleteTransaction(transaction: Transaction) {
    if (confirm(`Delete "${transaction.description || 'this transaction'}"?`)) {
      this.api.deleteTransaction(transaction.id).subscribe({
        next: () => {
          this.snackBar.open('Transaction deleted', 'Close', { duration: 3000 });
          this.loadTransactions();
        },
        error: () => {
          this.snackBar.open('Failed to delete transaction', 'Close', { duration: 3000 });
        },
      });
    }
  }

  formatCurrency(amount: number, currency = this.currencyService.displayCurrency()): string {
    return formatCurrencyValue(amount, currency);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}