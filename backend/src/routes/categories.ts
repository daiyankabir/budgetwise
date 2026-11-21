import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  icon: z.string().min(1, 'Icon is required').max(50, 'Icon too long'),
});

const updateCategorySchema = categorySchema.partial();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const categories = await db
      .prepare(`
        SELECT * FROM categories
        WHERE user_id = ? OR is_default = 1
        ORDER BY type, name
      `)
      .all(req.userId!);
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const category = await db
      .prepare('SELECT * FROM categories WHERE id = ? AND (user_id = ? OR is_default = 1)')
      .get(req.params.id, req.userId!);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = categorySchema.parse(req.body);

    const db = getDatabase();

    const result = await db
      .prepare('INSERT INTO categories (name, type, color, icon, user_id) VALUES (?, ?, ?, ?, ?)')
      .run(data.name, data.type, data.color, data.icon, req.userId!);

    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCategorySchema.parse(req.body);

    const db = getDatabase();

    const category = await db
      .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId!);

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id, req.userId!);

    await db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const updatedCategory = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

    res.json({ category: updatedCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const category = await db
      .prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId!);

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    const transactionCount = await db
      .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
      .get(req.params.id) as { count: number | string };

    if (Number(transactionCount.count) > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing transactions' });
    }

    await db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;