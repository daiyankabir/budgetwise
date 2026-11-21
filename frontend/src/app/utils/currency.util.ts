import { CurrencyCode } from '../models/models';

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const compact = Math.abs(amount) >= 1_000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 1 : 2,
  }).format(amount);
}

export function formatExchangeRate(rate: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 5,
  }).format(rate);
}
