import type { Response } from 'express';

export const SUPPORTED_CURRENCIES = ['USD', 'BDT', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export interface ExchangeRateSnapshot {
  rates: Record<string, number>;
  updatedAt: string;
  nextUpdateAt: number;
}

export interface CurrencyConversionRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
}

interface ProviderResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  time_next_update_unix: number;
  rates: Record<string, number>;
}

let cachedSnapshot: ExchangeRateSnapshot | undefined;
let pendingSnapshot: Promise<ExchangeRateSnapshot> | undefined;

export class ExchangeRateUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeRateUnavailableError';
  }
}

export function respondCurrencyError(error: unknown, res: Response, context: string) {
  if (error instanceof ExchangeRateUnavailableError) {
    return res.status(503).json({ error: error.message });
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

export function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot> {
  if (cachedSnapshot && Date.now() < cachedSnapshot.nextUpdateAt * 1000) {
    return Promise.resolve(cachedSnapshot);
  }
  if (pendingSnapshot) {
    return pendingSnapshot;
  }

  pendingSnapshot = fetchExchangeRateSnapshot();
  return pendingSnapshot.finally(() => {
    pendingSnapshot = undefined;
  });
}

async function fetchExchangeRateSnapshot(): Promise<ExchangeRateSnapshot> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`Exchange-rate provider returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as ProviderResponse;
    if (
      data.result !== 'success' ||
      data.base_code !== 'USD' ||
      !data.rates ||
      !Number.isFinite(data.time_next_update_unix) ||
      !data.time_last_update_utc
    ) {
      throw new Error('Exchange-rate provider returned an invalid response');
    }

    for (const currency of SUPPORTED_CURRENCIES) {
      if (!Number.isFinite(data.rates[currency]) || data.rates[currency] <= 0) {
        throw new Error(`Exchange rate unavailable for ${currency}`);
      }
    }

    cachedSnapshot = {
      rates: data.rates,
      updatedAt: data.time_last_update_utc,
      nextUpdateAt: data.time_next_update_unix,
    };
    return cachedSnapshot;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown provider error';
    throw new ExchangeRateUnavailableError(`Unable to retrieve current exchange rates: ${detail}`);
  }
}

export function getConversionRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  const sourceRate = rates[from];
  const targetRate = rates[to];
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) {
    throw new ExchangeRateUnavailableError(`Exchange rate unavailable for ${from} to ${to}`);
  }
  return targetRate / sourceRate;
}

export function roundCurrency(amount: number, currency: CurrencyCode): number {
  const fractionDigits = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  const factor = 10 ** fractionDigits;
  return Math.round((amount + Math.sign(amount) * Number.EPSILON) * factor) / factor;
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  return roundCurrency(amount * getConversionRate(from, to, rates), to);
}

export function listConversionRates(
  currencies: CurrencyCode[],
  target: CurrencyCode,
  rates: Record<string, number>,
): CurrencyConversionRate[] {
  return Array.from(new Set(currencies))
    .sort()
    .map((from) => ({
      from,
      to: target,
      rate: getConversionRate(from, target, rates),
    }));
}

export function convertGroupedAmounts(
  values: Array<{ currency: CurrencyCode; total: number }>,
  target: CurrencyCode,
  rates: Record<string, number>,
): { total: number; rates: CurrencyConversionRate[] } {
  const grouped = new Map<CurrencyCode, number>();
  for (const value of values) {
    grouped.set(value.currency, (grouped.get(value.currency) || 0) + value.total);
  }

  const conversionRates = listConversionRates(Array.from(grouped.keys()), target, rates);

  const total = Array.from(grouped.entries()).reduce(
    (sum, [from, amount]) => sum + amount * getConversionRate(from, target, rates),
    0,
  );

  return {
    total: roundCurrency(total, target),
    rates: conversionRates,
  };
}
