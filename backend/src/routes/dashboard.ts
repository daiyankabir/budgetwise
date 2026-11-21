import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  CurrencyCode,
  convertAmount,
  convertGroupedAmounts,
  getExchangeRateSnapshot,
  listConversionRates,
  respondCurrencyError,
} from '../services/currency.js';
import { getUserDisplayCurrency } from '../services/user-currency.js';

const router = Router();

router.use(authMiddleware);

const monthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)').optional(),
});

const trendPeriodSchema = z.enum(['7d', '15d', '30d', '3m']);

interface AmountByCurrency {
  currency: CurrencyCode;
  total: number;
}

interface SummaryAmount extends AmountByCurrency {
  type: 'income' | 'expense';
}

interface SpendingRow {
  id: number;
  name: string;
  color: string;
  icon: string;
  currency: CurrencyCode | null;
  total: number;
}

interface TrendRow {
  month: string;
  currency: CurrencyCode;
  income: number;
  expenses: number;
}

interface PeriodTrendRow {
  period: string;
  currency: CurrencyCode | null;
  income: number;
  expenses: number;
}

interface PeriodCurrencyAmounts {
  currency: CurrencyCode;
  income: number;
  expenses: number;
}

interface TopCategoryRow extends SpendingRow {}

interface TransactionRow {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  currency: CurrencyCode;
  type: 'income' | 'expense';
  description: string | null;
  date: string;
  created_at: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  category_type: string;
}

async function getRates(currencies: CurrencyCode[], target: CurrencyCode) {
  if (currencies.every((currency) => currency === target)) {
    return { rates: { [target]: 1 }, updatedAt: null };
  }
  const snapshot = await getExchangeRateSnapshot();
  return { rates: snapshot.rates, updatedAt: snapshot.updatedAt };
}

function handleError(error: unknown, res: Response, context: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }
  return respondCurrencyError(error, res, context);
}

router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { month } = monthSchema.parse(req.query);
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);

    const grouped = db
      .prepare(`
        SELECT type, currency, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND date LIKE ?
        GROUP BY type, currency
      `)
      .all(req.userId!, `${targetMonth}%`) as Array<SummaryAmount>;

    const recentTransactions = db
      .prepare(`
        SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.type as category_type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT 5
      `)
      .all(req.userId!) as TransactionRow[];

    const currencies = [
      ...grouped.map((entry) => entry.currency),
      ...recentTransactions.map((transaction) => transaction.currency),
    ];
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);
    const income = convertGroupedAmounts(
      grouped.filter((entry) => entry.type === 'income'),
      displayCurrency,
      rates,
    ).total;
    const expenses = convertGroupedAmounts(
      grouped.filter((entry) => entry.type === 'expense'),
      displayCurrency,
      rates,
    ).total;
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    res.json({
      summary: {
        income,
        expenses,
        balance,
        savingsRate: Math.round(savingsRate * 100) / 100,
      },
      recentTransactions: recentTransactions.map((transaction) => ({
        ...transaction,
        displayAmount: convertAmount(transaction.amount, transaction.currency, displayCurrency, rates),
        displayCurrency,
        conversionRate: listConversionRates([transaction.currency], displayCurrency, rates)[0].rate,
      })),
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get dashboard summary error');
  }
});

router.get('/spending-by-category', async (req: AuthRequest, res: Response) => {
  try {
    const { month } = monthSchema.parse(req.query);
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);

    const rows = db
      .prepare(`
        SELECT c.id, c.name, c.color, c.icon, t.currency, COALESCE(SUM(t.amount), 0) as total
        FROM categories c
        LEFT JOIN transactions t
          ON c.id = t.category_id AND t.user_id = ? AND t.type = 'expense' AND t.date LIKE ?
        WHERE c.type = 'expense' AND (c.user_id = ? OR c.is_default = 1)
        GROUP BY c.id, c.name, c.color, c.icon, t.currency
        HAVING total > 0
        ORDER BY total DESC
      `)
      .all(req.userId!, `${targetMonth}%`, req.userId!) as SpendingRow[];

    const byCategory = new Map<number, { id: number; name: string; color: string; icon: string; values: AmountByCurrency[] }>();
    for (const row of rows) {
      if (!row.currency) continue;
      const category = byCategory.get(row.id) ?? {
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        values: [],
      };
      category.values.push({ currency: row.currency, total: row.total });
      byCategory.set(row.id, category);
    }

    const currencies = rows.flatMap((row) => (row.currency ? [row.currency] : []));
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);
    const data = Array.from(byCategory.values()).map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      total: convertGroupedAmounts(category.values, displayCurrency, rates).total,
    }));
    const total = convertGroupedAmounts(
      rows.flatMap((row) => (row.currency ? [{ currency: row.currency, total: row.total }] : [])),
      displayCurrency,
      rates,
    ).total;
    data.sort((a, b) => b.total - a.total);

    res.json({
      data: data.map((category) => ({
        ...category,
        percentage: total > 0 ? Math.round((category.total / total) * 10000) / 100 : 0,
      })),
      total,
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get spending by category error');
  }
});

router.get('/monthly-trend', async (req: AuthRequest, res: Response) => {
  try {
    const monthsSchema = z.coerce.number().int().positive().max(120).default(6);
    const months = monthsSchema.parse(req.query.months ?? '6');
    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);

    const rows = db
      .prepare(`
        SELECT
          strftime('%Y-%m', date) as month,
          currency,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
        FROM transactions
        WHERE user_id = ? AND date >= date('now', ? || ' months')
        GROUP BY strftime('%Y-%m', date), currency
        ORDER BY month
      `)
      .all(req.userId!, `-${months + 1}`) as TrendRow[];

    const currencies = rows.map((row) => row.currency);
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);
    const groupedMonths = new Map<string, TrendRow[]>();
    for (const row of rows) {
      const entries = groupedMonths.get(row.month) ?? [];
      entries.push(row);
      groupedMonths.set(row.month, entries);
    }

    const trend = Array.from(groupedMonths.entries()).map(([month, entries]) => ({
      month,
      income: convertGroupedAmounts(
        entries.map((entry) => ({ currency: entry.currency, total: entry.income })),
        displayCurrency,
        rates,
      ).total,
      expenses: convertGroupedAmounts(
        entries.map((entry) => ({ currency: entry.currency, total: entry.expenses })),
        displayCurrency,
        rates,
      ).total,
    }));

    res.json({
      trend,
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get monthly trend error');
  }
});

router.get('/trend', async (req: AuthRequest, res: Response) => {
  try {
    const period = trendPeriodSchema.parse(req.query.period ?? '30d');
    const isMonthly = period === '3m';
    const startDateExpression = isMonthly
      ? "date('now', 'start of month', '-2 months')"
      : {
          '7d': "date('now', '-6 days')",
          '15d': "date('now', '-14 days')",
          '30d': "date('now', '-29 days')",
        }[period];
    const periodExpression = isMonthly ? "strftime('%Y-%m-01', t.date)" : 'date(t.date)';
    const nextPeriodExpression = isMonthly ? "date(value, '+1 month')" : "date(value, '+1 day')";
    const currentPeriodExpression = isMonthly ? "date('now', 'start of month')" : "date('now')";
    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);

    const rows = db
      .prepare(`
        WITH RECURSIVE periods(value) AS (
          SELECT ${startDateExpression}
          UNION ALL
          SELECT ${nextPeriodExpression} FROM periods WHERE value < ${currentPeriodExpression}
        ),
        grouped AS (
          SELECT
            ${periodExpression} as period,
            t.currency,
            SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
            SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
          FROM transactions t
          WHERE t.user_id = ? AND t.date >= ${startDateExpression} AND t.date <= date('now')
          GROUP BY ${periodExpression}, t.currency
        )
        SELECT
          periods.value as period,
          grouped.currency,
          COALESCE(grouped.income, 0) as income,
          COALESCE(grouped.expenses, 0) as expenses
        FROM periods
        LEFT JOIN grouped ON grouped.period = periods.value
        ORDER BY periods.value, grouped.currency
      `)
      .all(req.userId!) as PeriodTrendRow[];

    const currencies = Array.from(new Set(rows.flatMap((row) => (row.currency ? [row.currency] : []))));
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);
    const groupedPeriods = new Map<string, PeriodCurrencyAmounts[]>();
    for (const row of rows) {
      if (row.currency === null) {
        continue;
      }
      const entries = groupedPeriods.get(row.period) ?? [];
      entries.push({ currency: row.currency, income: row.income, expenses: row.expenses });
      groupedPeriods.set(row.period, entries);
    }

    const periods = Array.from(new Set(rows.map((row) => row.period)));
    const trend = periods.map((value) => {
      const entries = groupedPeriods.get(value) ?? [];
      return {
        period: value,
        income: convertGroupedAmounts(
          entries.map((entry) => ({ currency: entry.currency, total: entry.income })),
          displayCurrency,
          rates,
        ).total,
        expenses: convertGroupedAmounts(
          entries.map((entry) => ({ currency: entry.currency, total: entry.expenses })),
          displayCurrency,
          rates,
        ).total,
      };
    });

    res.json({
      trend,
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get transaction trend error');
  }
});

router.get('/income-vs-expense', async (req: AuthRequest, res: Response) => {
  try {
    const { month } = monthSchema.parse(req.query);
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);

    const grouped = db
      .prepare(`
        SELECT type, currency, SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND date LIKE ?
        GROUP BY type, currency
      `)
      .all(req.userId!, `${targetMonth}%`) as SummaryAmount[];

    const currencies = grouped.map((entry) => entry.currency);
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);

    res.json({
      income: convertGroupedAmounts(
        grouped.filter((entry) => entry.type === 'income'),
        displayCurrency,
        rates,
      ).total,
      expenses: convertGroupedAmounts(
        grouped.filter((entry) => entry.type === 'expense'),
        displayCurrency,
        rates,
      ).total,
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get income vs expense error');
  }
});

router.get('/top-categories', async (req: AuthRequest, res: Response) => {
  try {
    const { month, limit = '5' } = req.query;
    const targetMonth = (month as string) || new Date().toISOString().slice(0, 7);
    const numLimit = z.coerce.number().int().positive().max(100).default(5).parse(limit);
    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);

    const rows = db
      .prepare(`
        SELECT c.id, c.name, c.color, c.icon, t.currency, SUM(t.amount) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.type = 'expense' AND t.date LIKE ?
        GROUP BY c.id, c.name, c.color, c.icon, t.currency
      `)
      .all(req.userId!, `${targetMonth}%`) as TopCategoryRow[];

    const currencies = rows.map((row) => row.currency).filter((currency): currency is CurrencyCode => !!currency);
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);
    const categories = new Map<number, { id: number; name: string; color: string; icon: string; values: AmountByCurrency[] }>();
    for (const row of rows) {
      const category = categories.get(row.id) ?? {
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        values: [],
      };
      if (row.currency) category.values.push({ currency: row.currency, total: row.total });
      categories.set(row.id, category);
    }

    const topCategories = Array.from(categories.values())
      .map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        total: convertGroupedAmounts(category.values, displayCurrency, rates).total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, numLimit);

    res.json({
      topCategories,
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get top categories error');
  }
});

export default router;
