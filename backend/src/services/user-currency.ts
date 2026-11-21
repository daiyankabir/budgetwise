import { getDatabase } from '../database.js';
import { CurrencyCode, SUPPORTED_CURRENCIES } from './currency.js';

export function getUserDisplayCurrency(userId: number): CurrencyCode {
  const user = getDatabase()
    .prepare('SELECT display_currency FROM users WHERE id = ?')
    .get(userId) as { display_currency: string } | undefined;

  if (!user || !SUPPORTED_CURRENCIES.includes(user.display_currency as CurrencyCode)) {
    throw new Error('User currency preference is missing or invalid');
  }
  return user.display_currency as CurrencyCode;
}
