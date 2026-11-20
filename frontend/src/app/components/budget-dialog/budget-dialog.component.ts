import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Category, Budget } from '../../models/models';
import { ApiService } from '../../services/api.service';

interface BudgetDialogData {
  budget?: Budget;
  categories: Category[];
  month: string;
}

@Component({
  selector: 'app-budget-dialog',
  template: `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ data.budget ? 'Edit Budget' : 'Add Budget' }}</h2>
        <button class="modal-close" (click)="close()">&times;</button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
        <div class="form-field">
          <label class="form-label">Category</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-select formControlName="category_id" required>
              <mat-option *ngFor="let cat of data.categories" [value]="cat.id">
                <span class="category-badge" [style.background-color]="cat.color + '20'" [style.color]="cat.color">
                  <span class="material-icons category-icon">{{ cat.icon }}</span>
                  {{ cat.name }}
                </span>
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('category_id')?.hasError('required')">Category is required</mat-error>
          </mat-form-field>
        </div>

        <div class="form-field">
          <label class="form-label">Budget Amount</label>
          <mat-form-field appearance="outline" class="full-width">
            <span matPrefix>$</span>
            <input matInput type="number" formControlName="amount" placeholder="0.00" step="0.01" min="0.01" required>
            <mat-error *ngIf="form.get('amount')?.hasError('required')">Amount is required</mat-error>
            <mat-error *ngIf="form.get('amount')?.hasError('min')">Amount must be greater than 0</mat-error>
          </mat-form-field>
        </div>

        <div class="modal-footer">
          <button mat-button type="button" (click)="close()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || submitting">
            <span *ngIf="submitting">Saving...</span>
            <span *ngIf="!submitting">{{ data.budget ? 'Update' : 'Create' }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .modal { min-width: 400px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
    .modal-title { font-size: 1.25rem; font-weight: 600; color: #1e293b; margin: 0; }
    .modal-close { background: none; border: none; font-size: 1.5rem; color: #64748b; cursor: pointer; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease, color 0.2s ease; }
    .modal-close:hover { background: #f1f5f9; color: #1e293b; }
    .modal-body { padding: 24px; }
    .form-field { margin-bottom: 20px; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 6px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 16px 16px; margin: 0 -24px -24px -24px; }
    .category-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 0.8125rem; font-weight: 500; }
    .category-icon { font-size: 0.875rem; }
  `],
})
export class BudgetDialogComponent {
  form: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BudgetDialogComponent>,
    private api: ApiService,
    @Inject(MAT_DIALOG_DATA) public data: BudgetDialogData
  ) {
    this.form = this.fb.group({
      category_id: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
    });

    if (this.data.budget) {
      this.form.patchValue({
        category_id: this.data.budget.category_id,
        amount: this.data.budget.amount,
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting = true;
    const { category_id, amount } = this.form.value;

    const request = this.data.budget
      ? this.api.updateBudget(this.data.budget.id, amount)
      : this.api.createOrUpdateBudget({ category_id, amount, month: this.data.month });

    request.subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting = false;
      },
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}