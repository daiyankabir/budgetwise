import test from 'node:test';
import assert from 'node:assert/strict';
import { convertAmount, convertGroupedAmounts, getConversionRate } from '../src/services/currency.ts';

const rates = { USD: 1, EUR: 0.9, BDT: 120, GBP: 0.75, INR: 90, CAD: 1.4, AUD: 1.5, JPY: 100 };

test('converts grouped source totals into the selected currency', () => {
  const result = convertGroupedAmounts(
    [
      { currency: 'USD', total: 400 },
      { currency: 'USD', total: 600 },
      { currency: 'BDT', total: 120 },
    ],
    'EUR',
    rates,
  );

  assert.equal(result.total, 900.9);
  assert.equal(result.rates[0].from, 'BDT');
  assert.equal(result.rates[0].to, 'EUR');
  assert.ok(Math.abs(result.rates[0].rate - 0.0075) < 1e-12);
  assert.deepEqual(result.rates[1], { from: 'USD', to: 'EUR', rate: 0.9 });
});

test('rounds only after converting the grouped amount to a zero-decimal currency', () => {
  const result = convertGroupedAmounts(
    [
      { currency: 'USD', total: 0.004 },
      { currency: 'USD', total: 0.004 },
    ],
    'JPY',
    rates,
  );

  assert.equal(result.total, 1);
});

test('uses a rate of one for identical currencies', () => {
  assert.equal(getConversionRate('EUR', 'EUR', rates), 1);
  assert.equal(convertAmount(10.25, 'EUR', 'EUR', rates), 10.25);
});
