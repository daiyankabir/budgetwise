import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data', 'budgetwise.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): Database.Database {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'category',
      user_id INTEGER,
      is_default BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      description TEXT,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    )
  `);

  // Budgets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(user_id, category_id, month)
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
  `);

  // Seed default categories
  seedDefaultCategories();

  console.log('Database initialized successfully');
  return db;
}

function seedDefaultCategories() {
  const defaultCategories = [
    // Income categories
    { name: 'Salary', type: 'income', color: '#10b981', icon: 'work', is_default: 1 },
    { name: 'Freelance', type: 'income', color: '#059669', icon: 'laptop_mac', is_default: 1 },
    { name: 'Investments', type: 'income', color: '#047857', icon: 'trending_up', is_default: 1 },
    { name: 'Gifts', type: 'income', color: '#065f46', icon: 'card_giftcard', is_default: 1 },
    { name: 'Other Income', type: 'income', color: '#064e3b', icon: 'attach_money', is_default: 1 },

    // Expense categories
    { name: 'Housing', type: 'expense', color: '#ef4444', icon: 'home', is_default: 1 },
    { name: 'Transportation', type: 'expense', color: '#f97316', icon: 'directions_car', is_default: 1 },
    { name: 'Food & Dining', type: 'expense', color: '#eab308', icon: 'restaurant', is_default: 1 },
    { name: 'Utilities', type: 'expense', color: '#84cc16', icon: 'bolt', is_default: 1 },
    { name: 'Healthcare', type: 'expense', color: '#22c55e', icon: 'local_hospital', is_default: 1 },
    { name: 'Entertainment', type: 'expense', color: '#3b82f6', icon: 'movie', is_default: 1 },
    { name: 'Shopping', type: 'expense', color: '#8b5cf6', icon: 'shopping_bag', is_default: 1 },
    { name: 'Education', type: 'expense', color: '#ec4899', icon: 'school', is_default: 1 },
    { name: 'Other Expense', type: 'expense', color: '#6b7280', icon: 'more_horiz', is_default: 1 },
  ];

  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_default = 1');
  const { count } = checkStmt.get() as { count: number };

  if (count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO categories (name, type, color, icon, is_default)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((cats) => {
      for (const cat of cats) {
        insertStmt.run(cat.name, cat.type, cat.color, cat.icon, cat.is_default);
      }
    });

    insertMany(defaultCategories);
    console.log('Seeded 14 default categories');
  }
}

export function getDatabase(): Database.Database {
  return db;
}

export function closeDatabase() {
  db.close();
}

// Run initialization if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  initializeDatabase();
  closeDatabase();
}