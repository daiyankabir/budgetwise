import { Component, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CurrencyCode } from '../../models/models';
import { CurrencyService } from '../../services/currency.service';
import { formatExchangeRate } from '../../utils/currency.util';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-navbar',
  template: `
    <mat-toolbar class="navbar">
      <button type="button" class="navbar-brand" aria-label="BudgetWise home" (click)="goToDashboard()">
        <mat-icon>account_balance_wallet</mat-icon>
        <span>BudgetWise</span>
      </button>

      <nav class="navbar-nav" *ngIf="authService.isAuthenticated()">
        <a mat-button routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>dashboard</mat-icon>
          <span>Dashboard</span>
        </a>
        <a mat-button routerLink="/transactions" routerLinkActive="active">
          <mat-icon>receipt_long</mat-icon>
          <span>Transactions</span>
        </a>
        <a mat-button routerLink="/budgets" routerLinkActive="active">
          <mat-icon>account_balance</mat-icon>
          <span>Budgets</span>
        </a>
        <a mat-button routerLink="/reports" routerLinkActive="active">
          <mat-icon>analytics</mat-icon>
          <span>Reports</span>
        </a>
      </nav>

      <button
        mat-icon-button
        class="mobile-nav-toggle"
        [matMenuTriggerFor]="mobileNavigation"
        *ngIf="authService.isAuthenticated()"
        aria-label="Open navigation menu">
        <mat-icon>menu</mat-icon>
      </button>

      <div class="navbar-actions">
        <div class="currency-setting" *ngIf="authService.isAuthenticated()">
          <label class="sr-only" for="display-currency">Display currency</label>
          <select
            id="display-currency"
            name="displayCurrency"
            #currencySelect
            [ngModel]="currencyService.displayCurrency()"
            [disabled]="savingCurrency"
            (ngModelChange)="onDisplayCurrencyChange($event, currencySelect)">
            <option *ngFor="let option of currencyService.options" [value]="option.code">
              {{ option.code }}
            </option>
          </select>
          <span
            class="exchange-rate"
            *ngIf="currencyService.exchangeRate() as rate"
            [title]="rateUpdatedAtTitle()">
            1 {{ rate.from }} = {{ formatExchangeRate(rate.rate) }} {{ rate.to }}
          </span>
        </div>

        <button mat-icon-button [matMenuTriggerFor]="userMenu" *ngIf="authService.isAuthenticated()" aria-label="User menu">
          <mat-icon>account_circle</mat-icon>
        </button>

        <a mat-button routerLink="/login" *ngIf="!authService.isAuthenticated()">Login</a>
        <a mat-button routerLink="/register" *ngIf="!authService.isAuthenticated()" color="primary">Sign Up</a>
      </div>

      <mat-menu #userMenu="matMenu">
        <div class="menu-header">
          <div class="menu-user-info">
            <strong>{{ authService.user()?.email }}</strong>
          </div>
          <mat-divider></mat-divider>
        </div>
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>

      <mat-menu #mobileNavigation="matMenu">
        <button mat-menu-item routerLink="/dashboard">
          <mat-icon>dashboard</mat-icon>
          <span>Dashboard</span>
        </button>
        <button mat-menu-item routerLink="/transactions">
          <mat-icon>receipt_long</mat-icon>
          <span>Transactions</span>
        </button>
        <button mat-menu-item routerLink="/budgets">
          <mat-icon>account_balance</mat-icon>
          <span>Budgets</span>
        </button>
        <button mat-menu-item routerLink="/reports">
          <mat-icon>analytics</mat-icon>
          <span>Reports</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .mobile-nav-toggle {
      display: none;
    }

    .navbar {
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 0 24px;
      height: 64px;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      color: #0f766e;
      text-decoration: none;
      border: 0;
      background: transparent;
      padding: 0;
    }

    .navbar-brand mat-icon {
      font-size: 1.75rem;
      height: 1.75rem;
      width: 1.75rem;
    }

    .navbar-brand span {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 24px;
    }

    .navbar-nav a {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #475569;
      font-weight: 500;
      border-radius: 8px;
      padding: 8px 16px;
      transition: all 0.2s ease;
    }

    .navbar-nav a:hover {
      background: #f0fdfa;
      color: #0d9488;
    }

    .navbar-nav a.active {
      background: #f0fdfa;
      color: #0d9488;
    }

    .navbar-nav mat-icon {
      font-size: 1.25rem;
      height: 1.25rem;
      width: 1.25rem;
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;
    }

    .currency-setting {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .currency-setting select {
      height: 36px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
      color: #334155;
      padding: 0 8px;
      font: inherit;
    }

    .currency-setting select:disabled {
      opacity: 0.6;
    }

    .exchange-rate {
      color: #64748b;
      font-size: 0.75rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .menu-header {
      padding: 12px 16px;
    }

    .menu-user-info {
      font-size: 0.875rem;
      color: #374151;
    }

    @media (max-width: 768px) {
      .navbar {
        padding: 0 16px;
      }

      .navbar-nav {
        display: none;
      }

      .mobile-nav-toggle {
        display: inline-flex;
      }

      .navbar-brand span {
        display: none;
      }

      .navbar-actions {
        gap: 4px;
      }

      .currency-setting {
        margin-right: 4px;
      }

      .exchange-rate {
        display: none;
      }
    }
  `],
})
export class NavbarComponent {
  savingCurrency = false;
  readonly formatExchangeRate = formatExchangeRate;

  constructor(
    public authService: AuthService,
    public currencyService: CurrencyService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.currencyService.loadSettings().subscribe({
          error: (error) => {
            this.snackBar.open(error?.error?.error || 'Failed to load currency settings', 'Close', { duration: 4000 });
          },
        });
      }
    });
  }

  goToDashboard() {
    if (this.router.url.split('?')[0] === '/dashboard') {
      window.location.reload();
      return;
    }
    this.router.navigateByUrl('/dashboard');
  }

  onDisplayCurrencyChange(currency: CurrencyCode, select: HTMLSelectElement) {
    this.savingCurrency = true;
    this.currencyService.setDisplayCurrency(currency).subscribe({
      next: () => {
        this.savingCurrency = false;
      },
      error: (error) => {
        this.savingCurrency = false;
        select.value = this.currencyService.displayCurrency();
        this.snackBar.open(error?.error?.error || 'Failed to update currency', 'Close', { duration: 4000 });
      },
    });
  }

  rateUpdatedAtTitle(): string {
    const updatedAt = this.currencyService.ratesUpdatedAt();
    return updatedAt ? `Exchange rates updated ${updatedAt}` : 'No conversion required';
  }

  logout() {
    this.authService.logout();
  }
}