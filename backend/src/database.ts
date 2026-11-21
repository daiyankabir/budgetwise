import { Pool, types, type QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

types.setTypeParser(1082, (value) => value);

export interface QueryResult {
  changes: number;
  lastInsertRowid: number | undefined;
}

interface Statement {
  all<T extends QueryResultRow = QueryResultRow>(...params: unknown[]): Promise<T[]>;
  get<T extends QueryResultRow = QueryResultRow>(...params: unknown[]): Promise<T | undefined>;
  run(...params: unknown[]): Promise<QueryResult>;
}

let pool: Pool | undefined;
let initialization: Promise<void> | undefined;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to connect to PostgreSQL');
  }

  pool ??= new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

function parameterize(sql: string): string {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => `$${++parameterIndex}`);
}

function withReturningId(sql: string): string {
  const statement = sql.trim().replace(/;$/, '');
  if (/^(INSERT|UPDATE|DELETE)\b/i.test(statement) && !/\bRETURNING\b/i.test(statement)) {
    return `${statement} RETURNING id`;
  }
  return statement;
}

export function getDatabase() {
  return {
    prepare(sql: string): Statement {
      return {
        async all<T extends QueryResultRow>(...params: unknown[]): Promise<T[]> {
          const result = await getPool().query<T>(parameterize(sql), params);
          return result.rows;
        },
        async get<T extends QueryResultRow>(...params: unknown[]): Promise<T | undefined> {
          const result = await getPool().query<T>(parameterize(sql), params);
          return result.rows[0];
        },
        async run(...params: unknown[]): Promise<QueryResult> {
          const result = await getPool().query(withReturningId(parameterize(sql)), params);
          const id = result.rows[0]?.id;
          return {
            changes: result.rowCount ?? 0,
            lastInsertRowid: id === undefined ? undefined : Number(id),
          };
        },
      };
    },
  };
}

export function initializeDatabase(): Promise<void> {
  if (!initialization) {
    initialization = createSchema().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

async function createSchema(): Promise<void> {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      display_currency TEXT NOT NULL DEFAULT 'EUR'
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'category',
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      is_default SMALLINT NOT NULL DEFAULT 0
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      amount DOUBLE PRECISION NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      description TEXT,
      date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      currency TEXT NOT NULL DEFAULT 'USD'
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL,
      month TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      currency TEXT NOT NULL DEFAULT 'USD',
      UNIQUE(user_id, category_id, month)
    )
  `);

  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS display_currency TEXT NOT NULL DEFAULT \'EUR\'');
  await db.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT \'USD\'');
  await db.query('ALTER TABLE budgets ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT \'USD\'');
  await db.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month)');
  await db.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_default_categories_unique ON categories(name, type) WHERE is_default = 1'
  );

  await seedDefaultCategories(db);
  console.log('Database initialized successfully');
}

async function seedDefaultCategories(db: Pool): Promise<void> {
  await db.query(`
    INSERT INTO categories (name, type, color, icon, is_default)
    SELECT seed.name, seed.type, seed.color, seed.icon, 1
    FROM (VALUES
      ('Salary', 'income', '#10b981', 'work'),
      ('Freelance', 'income', '#059669', 'laptop_mac'),
      ('Investments', 'income', '#047857', 'trending_up'),
      ('Gifts', 'income', '#065f46', 'card_giftcard'),
      ('Other Income', 'income', '#064e3b', 'attach_money'),
      ('Housing', 'expense', '#ef4444', 'home'),
      ('Transportation', 'expense', '#f97316', 'directions_car'),
      ('Food & Dining', 'expense', '#eab308', 'restaurant'),
      ('Utilities', 'expense', '#84cc16', 'bolt'),
      ('Healthcare', 'expense', '#22c55e', 'local_hospital'),
      ('Entertainment', 'expense', '#3b82f6', 'movie'),
      ('Shopping', 'expense', '#8b5cf6', 'shopping_bag'),
      ('Education', 'expense', '#ec4899', 'school'),
      ('Other Expense', 'expense', '#6b7280', 'more_horiz')
    ) AS seed(name, type, color, icon)
    WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_default = 1)
    ON CONFLICT (name, type) WHERE is_default = 1 DO NOTHING
  `);
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    initialization = undefined;
  }
}
