import { Component, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CurrencyCode } from '../../models/models';
import { CurrencyService } from '../../services/currency.service';
import { formatExchangeRate } from '../../utils/currency.util';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThemeService } from '../../services/theme.service';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-navbar',
  template: `
    <mat-toolbar class="navbar">
      <div class="navbar-inner">
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
          <button
            mat-icon-button
            type="button"
            class="theme-toggle"
            [attr.aria-label]="themeToggleLabel()"
            [matTooltip]="themeToggleLabel()"
            (click)="toggleTheme()">
            <mat-icon>{{ themeService.current() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>

          <div class="currency-setting" *ngIf="authService.isAuthenticated()">
            <label class="sr-only" for="display-currency">Display currency</label>
            <mat-select
              id="display-currency"
              name="displayCurrency"
              #currencySelect
              class="currency-select"
              panelClass="currency-select-panel"
              aria-label="Display currency"
              [ngModel]="currencyService.displayCurrency()"
              [disabled]="savingCurrency"
              (ngModelChange)="onDisplayCurrencyChange($event, currencySelect)">
              <mat-option *ngFor="let option of currencyService.options" [value]="option.code">
                {{ option.code }}
              </mat-option>
            </mat-select>
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
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .mobile-nav-toggle {
      display: none;
    }

    .navbar {
      background: var(--bg-surface);
      color: var(--text-primary);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-card);
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      padding: 0;
      height: 64px;
      min-height: 64px;
      justify-content: center;
    }

    .navbar-inner {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 1520px;
      height: 100%;
      padding: 0 32px;
      margin: 0 auto;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      color: var(--accent);
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
      font-weight: 600;
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
      color: var(--text-secondary);
      font-weight: 500;
      border-radius: 8px;
      padding: 8px 16px;
      transition: background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
                  color 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .navbar-nav a:hover {
      background: var(--accent-soft);
      color: var(--accent);
    }

    .navbar-nav a.active {
      background: var(--accent-soft);
      color: var(--accent);
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

    .theme-toggle {
      color: var(--text-secondary);
    }

    .exchange-rate {
      color: var(--text-muted);
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
      color: var(--text-primary);
    }

    @media (max-width: 1024px) {
      .navbar-inner {
        padding: 0 24px;
      }
    }

    @media (max-width: 768px) {
      .navbar-inner {
        padding: 0 20px;
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

    @media (max-width: 480px) {
      .navbar-inner {
        padding: 0 16px;
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
    public themeService: ThemeService,
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

  onDisplayCurrencyChange(currency: CurrencyCode, select: MatSelect) {
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

  toggleTheme() {
    const theme = this.themeService.current() === 'dark' ? 'light' : 'dark';
    try {
      this.themeService.setTheme(theme);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save theme preference';
      this.snackBar.open(message, 'Close', { duration: 4000 });
    }
  }

  themeToggleLabel(): string {
    return this.themeService.current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  rateUpdatedAtTitle(): string {
    const updatedAt = this.currencyService.ratesUpdatedAt();
    return updatedAt ? `Exchange rates updated ${updatedAt}` : 'No conversion required';
  }

  logout() {
    this.authService.logout();
  }
}