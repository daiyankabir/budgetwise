import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Sign in to your BudgetWise account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-field">
            <label class="form-label">Email</label>
            <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
              <input matInput type="email" formControlName="email" placeholder="you@example.com" required autocomplete="email">
              <mat-icon matPrefix>email</mat-icon>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email address</mat-error>
            </mat-form-field>
          </div>

          <div class="form-field">
            <label class="form-label">Password</label>
            <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" placeholder="••••••••" required autocomplete="current-password">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="hidePassword ? 'Show password' : 'Hide password'">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>
          </div>

          <button mat-raised-button color="primary" type="submit" class="full-width auth-submit" [disabled]="form.invalid || loading">
            <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
            <span *ngIf="!loading">Sign In</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register" class="auth-link">Create one</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }

    .auth-submit {
      height: 48px;
      font-size: 1rem;
      margin-top: 8px;
    }

    .auth-submit mat-spinner {
      margin-right: 8px;
    }

    .auth-form {
      gap: 12px;
    }

    .form-field {
      margin-bottom: 0;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
  `],
})
export class LoginComponent {
  form: FormGroup;
  hidePassword = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const { email, password } = this.form.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error || 'Login failed. Please try again.', 'Close', {
          duration: 5000,
          panelClass: 'error-snackbar',
        });
      },
    });
  }
}