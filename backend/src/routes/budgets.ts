import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

const budgetSchema = z.object({
  category_id: z.number().int().positive('Invalid category'),
  amount: z.number().positive('Amount must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
});

interface BudgetRow {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  month: string;
  created_at: string;
  category_name: string;
  category_color: string;
  category_icon: string;
}

interface SpentRow {
  category_id: number;
  total: number;
}

router.get('/', (req: AuthRequest, res: Response) => {
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month as string)) {
    return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
  }

  const db = getDatabase();

  const budgets = db
    .prepare(
      `
    SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.month = ?
    ORDER BY c.name
  `
    )
    .all(req.userId!, month) as BudgetRow[];

  res.json({ budgets });
});

router.get('/overview', (req: AuthRequest, res: Response) => {
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month as string)) {
    return res.status(400).json({ error: 'Month parameter required (YYYY-MM)' });
  }

  const db = getDatabase();

  const budgets = db
    .prepare(
      `
    SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.month = ?
  `
    )
    .all(req.userId!, month as string) as BudgetRow[];

  const budgetIds = budgets.map((b) => b.category_id);
  let spentMap = new Map<number, number>();

  if (budgetIds.length > 0) {
    const placeholders = budgetIds.map(() => '?').join(',');
    const spent = db
      .prepare(
        `
      SELECT category_id, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date LIKE ? AND category_id IN (${placeholders})
      GROUP BY category_id
    `
      )
      .all(req.userId!, `${month}%`, ...budgetIds) as SpentRow[];

    spentMap = new Map(spent.map((s) => [s.category_id, s.total]));
  }

  const overview = budgets.map((budget) => {
    const spent = spentMap.get(budget.category_id) || 0;
    const remaining = budget.amount - spent;
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      ...budget,
      spent,
      remaining,
      percentage: Math.round(percentage * 100) / 100,
      isOverBudget: spent > budget.amount,
    };
  });

  const totalBudget = overview.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = overview.reduce((sum, b) => sum + b.spent, 0);

  res.json({
    overview,
    summary: {
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
      overallPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0,
    },
  });
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
      .prepare(
        `
      INSERT INTO budgets (user_id, category_id, amount, month)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, category_id, month) DO UPDATE SET amount = excluded.amount
    `
      )
      .run(req.userId!, data.category_id, data.amount, data.month);

    const budget = db
      .prepare(
        `
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `
      )
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
    const { amount } = z.object({ amount: z.number().positive() }).parse(req.body);

    const db = getDatabase();

    const budget = db
      .prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId!);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    db.prepare('UPDATE budgets SET amount = ? WHERE id = ? AND user_id = ?').run(amount, req.params.id, req.userId!);

    const updatedBudget = db
      .prepare(
        `
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `
      )
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