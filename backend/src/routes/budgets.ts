import { Router, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  CurrencyCode,
  convertAmount,
  convertGroupedAmounts,
  getConversionRate,
  getExchangeRateSnapshot,
  listConversionRates,
  respondCurrencyError,
  SUPPORTED_CURRENCIES,
} from '../services/currency.js';
import { getUserDisplayCurrency } from '../services/user-currency.js';

const router = Router();

router.use(authMiddleware);

const budgetSchema = z.object({
  category_id: z.number().int().positive('Invalid category'),
  amount: z.number().positive('Amount must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
});

interface BudgetRow {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  currency: CurrencyCode;
  month: string;
  created_at: string;
  category_name: string;
  category_color: string;
  category_icon: string;
}

interface SpentRow {
  category_id: number;
  currency: CurrencyCode;
  total: number;
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

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month as string)) {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }

    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);
    const budgets = db
      .prepare(`
        SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ? AND b.month = ?
        ORDER BY c.name
      `)
      .all(req.userId!, month) as BudgetRow[];
    const currencies = budgets.map((budget) => budget.currency);
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);

    res.json({
      budgets: budgets.map((budget) => ({
        ...budget,
        displayAmount: convertAmount(budget.amount, budget.currency, displayCurrency, rates),
        displayCurrency,
        conversionRate: getConversionRate(budget.currency, displayCurrency, rates),
      })),
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get budgets error');
  }
});

router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month as string)) {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
    }

    const db = getDatabase();
    const displayCurrency = getUserDisplayCurrency(req.userId!);
    const budgets = db
      .prepare(`
        SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ? AND b.month = ?
      `)
      .all(req.userId!, month as string) as BudgetRow[];

    const budgetIds = budgets.map((budget) => budget.category_id);
    let spent: SpentRow[] = [];

    if (budgetIds.length > 0) {
      const placeholders = budgetIds.map(() => '?').join(',');
      spent = db
        .prepare(`
          SELECT category_id, currency, SUM(amount) as total
          FROM transactions
          WHERE user_id = ? AND type = 'expense' AND date LIKE ? AND category_id IN (${placeholders})
          GROUP BY category_id, currency
        `)
        .all(req.userId!, `${month}%`, ...budgetIds) as SpentRow[];
    }

    const currencies = [
      ...budgets.map((budget) => budget.currency),
      ...spent.map((entry) => entry.currency),
    ];
    const { rates, updatedAt } = await getRates(currencies, displayCurrency);
    const spentByCategory = new Map<number, SpentRow[]>();
    for (const entry of spent) {
      const entries = spentByCategory.get(entry.category_id) ?? [];
      entries.push(entry);
      spentByCategory.set(entry.category_id, entries);
    }

    const overview = budgets.map((budget) => {
      const categorySpent = spentByCategory.get(budget.category_id) ?? [];
      const spentInBudgetCurrency = convertGroupedAmounts(
        categorySpent.map((entry) => ({ currency: entry.currency, total: entry.total })),
        budget.currency,
        rates,
      ).total;
      const remainingInBudgetCurrency = budget.amount - spentInBudgetCurrency;
      const percentage = budget.amount > 0 ? (spentInBudgetCurrency / budget.amount) * 100 : 0;

      return {
        ...budget,
        spent: spentInBudgetCurrency,
        remaining: remainingInBudgetCurrency,
        displayAmount: convertAmount(budget.amount, budget.currency, displayCurrency, rates),
        displaySpent: convertAmount(spentInBudgetCurrency, budget.currency, displayCurrency, rates),
        displayRemaining: convertAmount(remainingInBudgetCurrency, budget.currency, displayCurrency, rates),
        displayCurrency,
        conversionRate: getConversionRate(budget.currency, displayCurrency, rates),
        percentage: Math.round(percentage * 100) / 100,
        isOverBudget: spentInBudgetCurrency > budget.amount,
      };
    });

    const totalBudget = convertGroupedAmounts(
      budgets.map((budget) => ({ currency: budget.currency, total: budget.amount })),
      displayCurrency,
      rates,
    ).total;
    const totalSpent = convertGroupedAmounts(
      overview.map((budget) => ({ currency: budget.currency, total: budget.spent })),
      displayCurrency,
      rates,
    ).total;

    res.json({
      overview,
      summary: {
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        overallPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0,
      },
      displayCurrency,
      conversionRates: listConversionRates(currencies, displayCurrency, rates),
      ratesUpdatedAt: updatedAt,
    });
  } catch (error) {
    handleError(error, res, 'Get budget overview error');
  }
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = budgetSchema.parse(req.body);
    const db = getDatabase();

    const category = db
      .prepare('SELECT * FROM categories WHERE id = ? AND (user_id = ? OR is_default = 1)')
      .get(data.category_id, req.userId!) as { type: string } | undefined;

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (category.type !== 'expense') {
      return res.status(400).json({ error: 'Budgets can only be set for expense categories' });
    }

    const result = db
      .prepare(`
        INSERT INTO budgets (user_id, category_id, amount, month, currency)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, category_id, month)
        DO UPDATE SET amount = excluded.amount, currency = excluded.currency
      `)
      .run(req.userId!, data.category_id, data.amount, data.month, data.currency);

    const budget = db
      .prepare(`
        SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        WHERE b.id = ?
      `)
      .get(result.lastInsertRowid) as BudgetRow;

    res.status(201).json({ budget });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create/Update budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency } = z.object({
      amount: z.number().positive(),
      currency: z.enum(SUPPORTED_CURRENCIES).optional(),
    }).parse(req.body);

    const db = getDatabase();
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    db.prepare('UPDATE budgets SET amount = ?, currency = ? WHERE id = ? AND user_id = ?')
      .run(amount, currency ?? (budget as BudgetRow).currency, req.params.id, req.userId!);

    const updatedBudget = db
      .prepare(`
        SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        WHERE b.id = ?
      `)
      .get(req.params.id) as BudgetRow;

    res.json({ budget: updatedBudget });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.json({ success: true });
});

export default router;
