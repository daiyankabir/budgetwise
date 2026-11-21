import { Injectable, signal } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { CurrencyCode, CurrencyConversionRate, CurrencySettings } from '../models/models';

export const CURRENCY_OPTIONS: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'BDT', label: 'Bangladeshi Taka' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
];

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  readonly displayCurrency = signal<CurrencyCode>('EUR');
  readonly exchangeRate = signal<CurrencyConversionRate | null>(null);
  readonly ratesUpdatedAt = signal<string | null>(null);
  readonly options = CURRENCY_OPTIONS;

  private readonly currencyChanged = new Subject<CurrencyCode>();
  readonly currencyChanged$ = this.currencyChanged.asObservable();

  constructor(private api: ApiService, private authService: AuthService) {
    const savedCurrency = this.authService.user()?.display_currency;
    if (savedCurrency) this.displayCurrency.set(savedCurrency);
  }

  loadSettings(): Observable<CurrencySettings> {
    return this.api.getCurrencySettings().pipe(
      tap((settings) => this.applySettings(settings)),
    );
  }

  setDisplayCurrency(currency: CurrencyCode) {
    return this.api.updateDisplayCurrency(currency).pipe(
      tap((settings) => this.applySettings({
        ...settings,
        supportedCurrencies: this.options.map((option) => option.code),
      })),
    );
  }

  private applySettings(settings: CurrencySettings) {
    const changed = this.displayCurrency() !== settings.displayCurrency;
    this.displayCurrency.set(settings.displayCurrency);
    this.authService.updateDisplayCurrency(settings.displayCurrency);
    this.exchangeRate.set(settings.exchangeRate);
    this.ratesUpdatedAt.set(settings.ratesUpdatedAt);
    if (changed) {
      this.currencyChanged.next(settings.displayCurrency);
    }
  }
}
