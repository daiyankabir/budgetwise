import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  template: `
    <mat-toolbar class="navbar">
      <div class="navbar-brand" routerLink="/dashboard">
        <mat-icon>account_balance_wallet</mat-icon>
        <span>BudgetWise</span>
      </div>

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
    }
  `],
})
export class NavbarComponent {
  constructor(public authService: AuthService, private router: Router) {}

  logout() {
    this.authService.logout();
  }
}