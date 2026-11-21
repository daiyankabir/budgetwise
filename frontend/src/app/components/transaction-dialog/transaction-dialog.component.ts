import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Category, CurrencyCode, Transaction } from '../../models/models';
import { ApiService } from '../../services/api.service';
import { CURRENCY_OPTIONS } from '../../services/currency.service';

interface DialogData {
  transaction?: Transaction;
  categories: Category[];
  displayCurrency: CurrencyCode;
}

@Component({
  selector: 'app-transaction-dialog',
  template: `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ data.transaction ? 'Edit Transaction' : 'Add Transaction' }}</h2>
        <button class="modal-close" (click)="close()">&times;</button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
        <div class="form-field">
          <label class="form-label">Type</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-select formControlName="type" required>
              <mat-option value="income">Income</mat-option>
              <mat-option value="expense">Expense</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('type')?.hasError('required')">Type is required</mat-error>
          </mat-form-field>
        </div>

        <div class="form-field">
          <label class="form-label">Category</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-select formControlName="category_id" required>
              <mat-option *ngFor="let cat of filteredCategories" [value]="cat.id">
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
          <label class="form-label">Currency</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-select formControlName="currency" required>
              <mat-option *ngFor="let option of currencyOptions" [value]="option.code">
                {{ option.label }} ({{ option.code }})
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-field">
          <label class="form-label">Amount</label>
          <mat-form-field appearance="outline" class="full-width">
            <input matInput type="number" formControlName="amount" placeholder="0.00" step="0.01" min="0.01" required>
            <mat-error *ngIf="form.get('amount')?.hasError('required')">Amount is required</mat-error>
            <mat-error *ngIf="form.get('amount')?.hasError('min')">Amount must be greater than 0</mat-error>
          </mat-form-field>
        </div>

        <div class="form-field">
          <label class="form-label">Date</label>
          <mat-form-field appearance="outline" class="full-width">
            <input matInput [matDatepicker]="picker" formControlName="date" required>
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="form.get('date')?.hasError('required')">Date is required</mat-error>
          </mat-form-field>
        </div>

        <div class="form-field">
          <label class="form-label">Description (optional)</label>
          <mat-form-field appearance="outline" class="full-width">
            <input matInput formControlName="description" placeholder="Add a description..." maxlength="500">
          </mat-form-field>
        </div>

        <div class="modal-footer">
          <button mat-button type="button" (click)="close()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || submitting">
            <span *ngIf="submitting">Saving...</span>
            <span *ngIf="!submitting">{{ data.transaction ? 'Update' : 'Add' }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }

    .modal {
      width: 100%;
      min-width: 0;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #64748b;
      cursor: pointer;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .modal-close:hover {
      background: #f1f5f9;
      color: #1e293b;
    }

    .modal-body {
      padding: 24px;
    }

    .form-field {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 0 0 16px 16px;
      margin: 0 -24px -24px -24px;
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
  `],
})
export class TransactionDialogComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  filteredCategories: Category[] = [];
  readonly currencyOptions = CURRENCY_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TransactionDialogComponent>,
    private api: ApiService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      type: ['expense', Validators.required],
      category_id: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      currency: [data.transaction?.currency ?? data.displayCurrency, Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
    });
  }

  ngOnInit() {
    this.updateFilteredCategories();

    this.form.get('type')?.valueChanges.subscribe(() => {
      this.form.get('category_id')?.setValue(null);
      this.updateFilteredCategories();
    });

    if (this.data.transaction) {
      const t = this.data.transaction;
      this.form.patchValue({
        type: t.type,
        category_id: t.category_id,
        amount: t.amount,
        currency: t.currency,
        date: t.date,
        description: t.description || '',
      });
      this.updateFilteredCategories();
    }
  }

  updateFilteredCategories() {
    const type = this.form.get('type')?.value;
    this.filteredCategories = this.data.categories.filter(c => c.type === type);
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting = true;
    const formValue = this.form.value;

    const request = this.data.transaction
      ? this.api.updateTransaction(this.data.transaction.id, formValue)
      : this.api.createTransaction(formValue);

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