import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Start tracking your finances with BudgetWise</p>
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
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" placeholder="••••••••" required autocomplete="new-password" minlength="8">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="hidePassword ? 'Show password' : 'Hide password'">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Password is required</mat-error>
              <mat-error *ngIf="form.get('password')?.hasError('minlength')">Password must be at least 8 characters</mat-error>
            </mat-form-field>
          </div>

          <div class="form-field">
            <label class="form-label">Confirm Password</label>
            <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
              <input matInput [type]="hideConfirmPassword ? 'password' : 'text'" formControlName="confirmPassword" placeholder="••••••••" required autocomplete="new-password">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword" [attr.aria-label]="hideConfirmPassword ? 'Show password' : 'Hide password'">
                <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('confirmPassword')?.hasError('required')">Please confirm your password</mat-error>
              <mat-error *ngIf="form.hasError('passwordMismatch')">Passwords do not match</mat-error>
            </mat-form-field>
          </div>

          <button mat-raised-button color="primary" type="submit" class="full-width auth-submit" [disabled]="form.invalid || loading">
            <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
            <span *ngIf="!loading">Create Account</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login" class="auth-link">Sign in</a></p>
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
export class RegisterComponent {
  form: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const { email, password } = this.form.value;

    this.authService.register(email, password).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error || 'Registration failed. Please try again.', 'Close', {
          duration: 5000,
          panelClass: 'error-snackbar',
        });
      },
    });
  }
}