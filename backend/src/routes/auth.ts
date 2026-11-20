import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = registerSchema.parse(req.body);

    const db = getDatabase();

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);

    const userId = result.lastInsertRowid as number;

    const token = generateToken(userId);

    res.status(201).json({
      user: { id: userId, email },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const db = getDatabase();

    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email) as
      | { id: number; email: string; password_hash: string }
      | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.userId!) as
    | { id: number; email: string; created_at: string }
    | undefined;

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

export default router;