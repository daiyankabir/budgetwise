# 💰 BudgetWise — Smart Personal Finance Tracker

A modern, full-stack personal finance application built with Angular 17, Node.js/Express, and SQLite. Track income, expenses, budgets, and visualize your financial health with beautiful charts.

## ✨ Features

- **🔐 Authentication** — JWT-based auth with bcrypt password hashing, auto-login
- **📊 Dashboard** — Summary cards, doughnut chart (spending by category), bar chart (6-month trend), recent transactions
- **💳 Transactions** — Full CRUD with filtering, pagination, and CSV bulk import
- **🎯 Budgets** — Per-category monthly budgets with progress bars and over-budget alerts
- **📈 Reports** — Savings rate, income vs expense comparison, top categories, monthly trends

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 17 (standalone components, signals, new control flow) |
| UI | Angular Material |
| Charts | Chart.js + ng2-charts |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (better-sqlite3) — zero config |
| Auth | JWT + bcryptjs |
| Container | Docker + Docker Compose |
| Proxy | Nginx (production) |

## 🚀 Quick Start

### Docker (Recommended — any OS) 🐳

```bash
cd budgetwise
docker-compose up --build
```

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3000

### Local Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev    # → http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm install
npm start      # → http://localhost:4200 (proxied to backend)
```

## 📂 Project Structure

```
budgetwise/
├── docker-compose.yml          ← Orchestrates both services
├── .gitignore
├── README.md
│
├── backend/                    ← Node.js + Express + TypeScript + SQLite
│   ├── Dockerfile              ← Multi-stage build
│   ├── .dockerignore
│   ├── .env                    ← JWT_SECRET, DB_PATH, PORT
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            ← Express server entry point
│       ├── database.ts         ← SQLite schema + 14 seed categories
│       ├── middleware/auth.ts  ← JWT verification middleware
│       └── routes/
│           ├── auth.ts         ← Register, Login, Get current user
│           ├── categories.ts   ← Category CRUD
│           ├── transactions.ts ← Transaction CRUD + pagination + bulk import
│           ├── budgets.ts      ← Budget upsert + monthly overview
│           └── dashboard.ts    ← Aggregation endpoints for charts
│
├── frontend/                   ← Angular 17 + Material + Chart.js
│   ├── Dockerfile              ← Multi-stage → Nginx
│   ├── nginx.conf              ← SPA routing + API reverse proxy
│   ├── angular.json
│   ├── package.json
│   ├── proxy.conf.json         ← Dev proxy to backend:3000
│   └── src/
│       ├── index.html
│       ├── main.ts
│       ├── styles.scss         ← Teal/green theme, animations, utils
│       └── app/
│           ├── app.component.ts
│           ├── app.config.ts   ← Router, HTTP, Animations, Charts
│           ├── app.routes.ts   ← Lazy-loaded routes with auth guard
│           ├── models/models.ts
│           ├── guards/auth.guard.ts
│           ├── services/
│           │   ├── api.service.ts        ← 20 endpoint methods
│           │   ├── auth.service.ts       ← JWT + auto-login
│           │   └── auth.interceptor.ts   ← Bearer token injection
│           ├── components/
│           │   ├── navbar/               ← Responsive Material toolbar
│           │   └── transaction-dialog/   ← Add/Edit transaction modal
│           └── pages/
│               ├── login/        ← Gradient auth page
│               ├── register/     ← Account creation
│               ├── dashboard/    ← Charts + summary cards
│               ├── transactions/ ← Filtered table + CRUD
│               ├── budgets/      ← Monthly budget tracker
│               └── reports/      ← Analytics + savings rate
```

## 🔧 Configuration

### Backend Environment Variables (`backend/.env`)

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DB_PATH=./data/budgetwise.db
PORT=3000
NODE_ENV=development
```

> [!IMPORTANT]
> **Before deploying to production:** Change the `JWT_SECRET` in `backend/.env`!

### Frontend Environment

- Development: `frontend/src/environments/environment.ts` (proxies to `http://localhost:3000/api`)
- Production: `frontend/src/environments/environment.prod.ts` (uses `/api` via Nginx proxy)

## 📊 API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user

### Categories
- `GET /api/categories` — List all categories (default + user)
- `POST /api/categories` — Create custom category
- `PUT /api/categories/:id` — Update category
- `DELETE /api/categories/:id` — Delete category

### Transactions
- `GET /api/transactions` — List with pagination, filters
- `POST /api/transactions` — Create transaction
- `PUT /api/transactions/:id` — Update transaction
- `DELETE /api/transactions/:id` — Delete transaction
- `POST /api/transactions/import` — Bulk import from CSV

### Budgets
- `GET /api/budgets?month=YYYY-MM` — List budgets for month
- `GET /api/budgets/overview?month=YYYY-MM` — Budget overview with spending
- `POST /api/budgets` — Create/update budget (upsert)
- `PUT /api/budgets/:id` — Update budget amount
- `DELETE /api/budgets/:id` — Delete budget

### Dashboard
- `GET /api/dashboard/summary?month=YYYY-MM` — Summary cards + recent transactions
- `GET /api/dashboard/spending-by-category?month=YYYY-MM` — Category spending for doughnut chart
- `GET /api/dashboard/monthly-trend?months=6` — 6-month trend for bar chart
- `GET /api/dashboard/income-vs-expense?month=YYYY-MM` — Income vs expense comparison
- `GET /api/dashboard/top-categories?month=YYYY-MM&limit=5` — Top spending categories

## 🐳 Docker Deployment

### Production Build

```bash
docker-compose up --build -d
```

### Reset Database

```bash
docker-compose down -v
docker-compose up --build
```

### Volumes

- `backend_data` — Persists SQLite database

## 🧪 Development

### Backend Commands

```bash
cd backend
npm run dev      # Start with hot reload (tsx)
npm run build    # Compile TypeScript
npm run start    # Run compiled JS
npm run db:reset # Re-initialize database
```

### Frontend Commands

```bash
cd frontend
npm start        # Dev server with proxy
npm run build    # Production build
npm run build:dev # Development build
npm run watch    # Watch mode build
npm run test     # Run unit tests
```

## 📝 CSV Import Format

For bulk transaction import, use a CSV with these columns:

```csv
date,type,category,amount,description
2024-01-15,expense,Food & Dining,25.50,Lunch with friends
2024-01-16,income,Salary,5000.00,Monthly salary
```

- `date`: YYYY-MM-DD format
- `type`: `income` or `expense`
- `category`: Must match existing category name (case-insensitive)
- `amount`: Positive number
- `description`: Optional

## 🎨 Theming

The app uses a custom teal/green Material theme defined in `frontend/src/styles.scss`. Primary colors:

- Primary: `#14b8a6` (teal)
- Accent: `#eab308` (amber)
- Warn: `#ef4444` (red)

## 📄 License

MIT License — feel free to use for personal or commercial projects.

---

Built with ❤️ using Angular, Node.js, and SQLite