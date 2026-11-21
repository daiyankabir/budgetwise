# 💰 BudgetWise — Smart Personal Finance Tracker

A modern, full-stack personal finance application built with Angular 17, Node.js/Express, and SQLite. Track income, expenses, budgets, and visualize your financial health with beautiful charts.

## ✨ Features

- **🔐 Authentication** — JWT-based auth with bcrypt password hashing, auto-login
- **📊 Dashboard** — Summary cards, doughnut chart (spending by category), bar chart (6-month trend), recent transactions; clicking the logo returns to the current month
- **💳 Transactions** — Full CRUD with filtering, pagination, and CSV bulk import
- **🎯 Budgets** — Per-category monthly budgets with progress bars and over-budget alerts
- **📈 Reports** — Savings rate, income vs expense comparison, top categories, monthly trends
- **💱 Currency conversion** — Per-transaction and per-budget currencies, with server-side conversion into a saved display currency
- **🔢 Compact amounts** — Large values use K/M/B notation (for example, €1.2K or €3M)
- **🎨 Themes** — Switch between light and graphite dark; the selection is saved in this browser

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

- **Frontend:** http://localhost:4201
- **Backend API:** http://localhost:3001

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
│       ├── styles.scss         ← Theme palettes, design tokens, and utilities
│       └── app/
│           ├── app.component.ts
│           ├── app.config.ts   ← Router, HTTP, Animations, Charts
│           ├── app.routes.ts   ← Lazy-loaded routes with auth guard
│           ├── models/models.ts
│           ├── guards/auth.guard.ts
│           ├── services/
│           │   ├── api.service.ts        ← 20 endpoint methods
│           │   ├── auth.service.ts       ← JWT + auto-login
│           │   ├── auth.interceptor.ts   ← Bearer token injection
│           │   └── theme.service.ts      ← Browser-persisted theme preference
│           ├── components/
│           │   ├── navbar/               ← Responsive Material toolbar
│           │   └── transaction-dialog/   ← Add/Edit transaction modal
│           └── pages/
│               ├── login/        ← Theme-aware sign in
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

### Settings
- `GET /api/settings` — Get display currency and current USD exchange rate
- `PUT /api/settings/currency` — Save the display currency (`displayCurrency`)

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
date,type,category,amount,currency,description
2024-01-15,expense,Food & Dining,25.50,USD,Lunch with friends
2024-01-16,income,Salary,5000.00,EUR,Monthly salary
```

- `date`: YYYY-MM-DD format
- `type`: `income` or `expense`
- `category`: Must match existing category name (case-insensitive)
- `amount`: Positive number
- `currency`: Optional ISO code (`USD`, `BDT`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, or `JPY`); defaults to USD
- `description`: Optional

Existing transactions and budgets are migrated as USD. New transaction and budget forms default to the saved display currency. The backend totals amounts per source currency before converting them using the latest cached rates from ExchangeRate-API; the application shows the applied rates and their update time. The display currency defaults to EUR.

## 🎨 Theming

Use the theme button in the top navigation to switch between Light and Dark. The choice is saved in this browser and applies across authentication pages, dashboards, forms, dialogs, and charts.

## 📄 License

MIT License — feel free to use for personal or commercial projects.

---

Built with ❤️ using Angular, Node.js, and SQLite