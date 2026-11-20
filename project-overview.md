# 💰 BudgetWise — Smart Personal Finance Tracker

## Project Location
📁 [`C:\Users\Daiyan Kabir\.gemini\antigravity\scratch\budgetwise`](file:///C:/Users/Daiyan Kabir/.gemini/antigravity/scratch/budgetwise)

---

## 📂 Complete File Structure (46 files)

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

---

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

---

## ✨ Feature Summary

| Page | What it does |
|------|-------------|
| **🔐 Login/Register** | JWT auth with bcrypt-hashed passwords, auto-login |
| **📊 Dashboard** | 4 summary cards, doughnut chart (spending), bar chart (6-month trend), recent transactions |
| **💳 Transactions** | Full CRUD table with date/category/type filters, pagination, CSV bulk import |
| **🎯 Budgets** | Per-category monthly budgets with progress bars, over-budget red alerts |
| **📈 Reports** | Savings rate %, income vs expense comparison, horizontal bar chart for top categories |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 17 (standalone components, `@if`/`@for` syntax) |
| UI | Angular Material |
| Charts | Chart.js + ng2-charts |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (better-sqlite3) — zero config |
| Auth | JWT + bcryptjs |
| Container | Docker + Docker Compose |
| Proxy | Nginx (production) |

> [!IMPORTANT]
> **Before deploying to production:** Change the `JWT_SECRET` in [`backend/.env`](file:///C:/Users/Daiyan Kabir/.gemini/antigravity/scratch/budgetwise/backend/.env)!

> [!TIP]
> To reset the database, run `docker-compose down -v` then `docker-compose up --build`.
