import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

const monthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)').optional(),
});

interface SpendingRow {
  id: number;
  name: string;
  color: string;
  icon: string;
  total: number;
}

interface TrendRow {
  month: string;
  income: number;
  expenses: number;
}

interface TopCategoryRow {
  id: number;
  name: string;
  color: string;
  icon: string;
  total: number;
}

interface TransactionRow {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  date: string;
  created_at: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  category_type: string;
}

router.get('/summary', (req: AuthRequest, res: Response) => {
  const { month } = monthSchema.parse(req.query);
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const db = getDatabase();

  const incomeResult = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = ? AND type = 'income' AND date LIKE ?
  `
    )
    .get(req.userId!, `${targetMonth}%`) as { total: number };

  const expenseResult = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = ? AND type = 'expense' AND date LIKE ?
  `
    )
    .get(req.userId!, `${targetMonth}%`) as { total: number };

  const income = incomeResult.total;
  const expenses = expenseResult.total;
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const recentTransactions = db
    .prepare(
      `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.type as category_type
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 5
  `
    )
    .all(req.userId!) as TransactionRow[];

  res.json({
    summary: {
      income,
      expenses,
      balance,
      savingsRate: Math.round(savingsRate * 100) / 100,
    },
    recentTransactions,
  });
});

router.get('/spending-by-category', (req: AuthRequest, res: Response) => {
  const { month } = monthSchema.parse(req.query);
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const db = getDatabase();

  const spending = db
    .prepare(
      `
    SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(t.amount), 0) as total
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ? AND t.type = 'expense' AND t.date LIKE ?
    WHERE c.type = 'expense' AND (c.user_id = ? OR c.is_default = 1)
    GROUP BY c.id, c.name, c.color, c.icon
    HAVING total > 0
    ORDER BY total DESC
  `
    )
    .all(req.userId!, `${targetMonth}%`, req.userId!) as SpendingRow[];

  const total = spending.reduce((sum, s) => sum + s.total, 0);

  const data = spending.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    icon: s.icon,
    total: s.total,
    percentage: total > 0 ? Math.round((s.total / total) * 10000) / 100 : 0,
  }));

  res.json({ data, total });
});

router.get('/monthly-trend', (req: AuthRequest, res: Response) => {
  const { months = '6' } = req.query;
  const numMonths = parseInt(months as string, 10) || 6;

  const db = getDatabase();

  const trend = db
    .prepare(
      `
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM transactions
    WHERE user_id = ? AND date >= date('now', ? || ' months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month
  `
    )
    .all(req.userId!, `-${numMonths + 1}`) as TrendRow[];

  res.json({ trend });
});

router.get('/income-vs-expense', (req: AuthRequest, res: Response) => {
  const { month } = monthSchema.parse(req.query);
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const db = getDatabase();

  const result = db
    .prepare(
      `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM transactions
    WHERE user_id = ? AND date LIKE ?
  `
    )
    .get(req.userId!, `${targetMonth}%`) as { income: number; expenses: number };

  res.json({
    income: result.income || 0,
    expenses: result.expenses || 0,
  });
});

router.get('/top-categories', (req: AuthRequest, res: Response) => {
  const { month, limit = '5' } = req.query;
  const targetMonth = (month as string) || new Date().toISOString().slice(0, 7);
  const numLimit = parseInt(limit as string, 10) || 5;

  const db = getDatabase();

  const topCategories = db
    .prepare(
      `
    SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense' AND t.date LIKE ?
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY total DESC
    LIMIT ?
  `
    )
    .all(req.userId!, `${targetMonth}%`, numLimit) as TopCategoryRow[];

  res.json({ topCategories });
});

export default router;