import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

const transactionSchema = z.object({
  category_id: z.number().int().positive('Invalid category'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  description: z.string().max(500, 'Description too long').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

const updateTransactionSchema = transactionSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
});

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

interface CategoryRow {
  id: number;
  name: string;
  type: string;
}

interface InsertTransaction {
  category_id: number;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  date: string;
}

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, type, category_id, start_date, end_date, search } = querySchema.parse(req.query);

    const db = getDatabase();

    let whereClause = 'WHERE t.user_id = ?';
    const params: unknown[] = [req.userId!];

    if (type) {
      whereClause += ' AND t.type = ?';
      params.push(type);
    }
    if (category_id) {
      whereClause += ' AND t.category_id = ?';
      params.push(category_id);
    }
    if (start_date) {
      whereClause += ' AND t.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND t.date <= ?';
      params.push(end_date);
    }
    if (search) {
      whereClause += ' AND (t.description LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM transactions t ${whereClause}`);
    const { total } = countStmt.get(...params) as { total: number };

    const offset = (page - 1) * limit;

    const transactions = db
      .prepare(
        `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.type as category_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...params, limit, offset) as TransactionRow[];

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const transaction = db
    .prepare(
      `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.type as category_type
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.id = ? AND t.user_id = ?
  `
    )
    .get(req.params.id, req.userId!) as TransactionRow | undefined;

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  res.json({ transaction });
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = transactionSchema.parse(req.body);

    const db = getDatabase();

    const category = db
      .prepare('SELECT * FROM categories WHERE id = ? AND (user_id = ? OR is_default = 1)')
      .get(data.category_id, req.userId!) as CategoryRow | undefined;

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (category.type !== data.type) {
      return res.status(400).json({ error: 'Category type does not match transaction type' });
    }

    const result = db
      .prepare(
        `
      INSERT INTO transactions (user_id, category_id, amount, type, description, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(req.userId!, data.category_id, data.amount, data.type, data.description || null, data.date);

    const transaction = db
      .prepare(
        `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.type as category_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `
      )
      .get(result.lastInsertRowid) as TransactionRow;

    res.status(201).json({ transaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateTransactionSchema.parse(req.body);

    const db = getDatabase();

    const transaction = db
      .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId!) as TransactionRow | undefined;

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (data.category_id) {
      const category = db
        .prepare('SELECT * FROM categories WHERE id = ? AND (user_id = ? OR is_default = 1)')
        .get(data.category_id, req.userId!) as CategoryRow | undefined;

      if (!category) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const type = data.type || transaction.type;
      if (category.type !== type) {
        return res.status(400).json({ error: 'Category type does not match transaction type' });
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(data.category_id);
    }
    if (data.amount !== undefined) {
      updates.push('amount = ?');
      values.push(data.amount);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.date !== undefined) {
      updates.push('date = ?');
      values.push(data.date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id, req.userId!);

    db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const updatedTransaction = db
      .prepare(
        `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.type as category_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `
      )
      .get(req.params.id) as TransactionRow;

    res.json({ transaction: updatedTransaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  res.json({ success: true });
});

const upload = multer({ storage: multer.memoryStorage() });

router.post('/import', upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const db = getDatabase();

    const userCategories = db
      .prepare('SELECT id, name, type FROM categories WHERE user_id = ? OR is_default = 1')
      .all(req.userId!) as CategoryRow[];

    const categoryMap = new Map<string, { id: number; type: string }>();
    for (const cat of userCategories) {
      categoryMap.set(cat.name.toLowerCase(), { id: cat.id, type: cat.type });
    }

    const insertStmt = db.prepare(
      `
      INSERT INTO transactions (user_id, category_id, amount, type, description, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    );

    const insertMany = db.transaction((transactions: InsertTransaction[]) => {
      for (const t of transactions) {
        insertStmt.run(req.userId!, t.category_id, t.amount, t.type, t.description, t.date);
      }
    });

    const results = { success: 0, failed: 0, errors: [] as string[] };

    const toInsert: InsertTransaction[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 for header and 0-index

      try {
        const categoryName = (row.category || '').toLowerCase();
        const category = categoryMap.get(categoryName);

        if (!category) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Category "${row.category}" not found`);
          continue;
        }

        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Invalid amount`);
          continue;
        }

        const type = (row.type || '').toLowerCase();
        if (!['income', 'expense'].includes(type)) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Invalid type (must be income or expense)`);
          continue;
        }

        if (category.type !== type) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Category type mismatch`);
          continue;
        }

        const date = row.date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Invalid date format (use YYYY-MM-DD)`);
          continue;
        }

        toInsert.push({
          category_id: category.id,
          amount,
          type: type as 'income' | 'expense',
          description: row.description || null,
          date,
        });

        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    if (toInsert.length > 0) {
      insertMany(toInsert);
    }

    res.json(results);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;