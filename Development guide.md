# 🏋️ Gym Management Web App — Cursor Development Guide

> **Scope:** 6 core modules · No payment integration · Manual entry throughout  
> **Stack:** React + Tailwind CSS · Node.js + Express · PostgreSQL  
> **Build Timeline:** Phase 1 (6–8 weeks) + Phase 2 (5–6 weeks)

---

## 📁 Project Structure

```
gym-management/
├── client/                        # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/                   # Axios API call functions
│   │   ├── components/            # Reusable UI components
│   │   │   ├── common/            # Button, Input, Modal, Table, Badge
│   │   │   ├── layout/            # Sidebar, Navbar, PageWrapper
│   │   │   └── modules/           # Module-specific components
│   │   ├── pages/                 # One folder per module
│   │   │   ├── Dashboard/
│   │   │   ├── Members/
│   │   │   ├── Attendance/
│   │   │   ├── Subscriptions/
│   │   │   ├── Staff/
│   │   │   ├── Inventory/
│   │   │   └── Reports/
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── store/                 # Zustand global state
│   │   ├── utils/                 # Date helpers, formatters
│   │   ├── routes/                # React Router config
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   └── package.json
│
├── server/                        # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   ├── routes/                # Express route definitions
│   │   ├── models/                # DB query functions (no ORM)
│   │   ├── middleware/            # Auth, error handler, validator
│   │   ├── db/
│   │   │   ├── pool.js            # PostgreSQL connection pool
│   │   │   └── migrations/        # SQL schema migration files
│   │   ├── utils/                 # Logger, response helpers
│   │   └── app.js
│   ├── .env
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Tech Stack & Packages

### Frontend (`client/`)
```bash
npm create vite@latest client -- --template react
cd client
npm install react-router-dom axios zustand
npm install @tanstack/react-query
npm install react-hook-form zod @hookform/resolvers
npm install recharts                          # Charts for Reports
npm install react-hot-toast                   # Notifications
npm install lucide-react                      # Icons
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Backend (`server/`)
```bash
mkdir server && cd server && npm init -y
npm install express pg dotenv cors helmet morgan
npm install bcryptjs jsonwebtoken
npm install express-validator
npm install -D nodemon
```

---

## 🗄️ Database Schema (PostgreSQL)

Run these migrations in order inside `server/src/db/migrations/`.

### `001_create_members.sql`
```sql
CREATE TABLE members (
  id          SERIAL PRIMARY KEY,
  member_code VARCHAR(20) UNIQUE NOT NULL,
  full_name   VARCHAR(100) NOT NULL,
  dob         DATE,
  phone       VARCHAR(20),
  email       VARCHAR(100),
  address     TEXT,
  photo_url   TEXT,
  fitness_goal TEXT,
  health_notes TEXT,
  status      VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### `002_create_staff.sql`
```sql
CREATE TABLE staff (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  role        VARCHAR(20) CHECK (role IN ('admin','trainer','reception')),
  phone       VARCHAR(20),
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  shift_info  TEXT,
  status      VARCHAR(10) DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### `003_create_subscriptions.sql`
```sql
CREATE TABLE subscription_plans (
  id          SERIAL PRIMARY KEY,
  plan_name   VARCHAR(50) NOT NULL,
  duration    VARCHAR(20) CHECK (duration IN ('monthly','quarterly','yearly')),
  price       NUMERIC(10,2) NOT NULL
);

CREATE TABLE member_subscriptions (
  id          SERIAL PRIMARY KEY,
  member_id   INT REFERENCES members(id) ON DELETE CASCADE,
  plan_id     INT REFERENCES subscription_plans(id),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      VARCHAR(15) DEFAULT 'active' CHECK (status IN ('active','expired','pending')),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### `004_create_attendance.sql`
```sql
CREATE TABLE attendance (
  id          SERIAL PRIMARY KEY,
  member_id   INT REFERENCES members(id) ON DELETE CASCADE,
  check_in    TIMESTAMP NOT NULL DEFAULT NOW(),
  check_out   TIMESTAMP,
  marked_by   INT REFERENCES staff(id),
  created_at  DATE DEFAULT CURRENT_DATE
);
```

### `005_create_trainer_assignments.sql`
```sql
CREATE TABLE trainer_assignments (
  id          SERIAL PRIMARY KEY,
  trainer_id  INT REFERENCES staff(id),
  member_id   INT REFERENCES members(id),
  assigned_on DATE DEFAULT CURRENT_DATE
);
```

### `006_create_inventory.sql`
```sql
CREATE TABLE inventory (
  id              SERIAL PRIMARY KEY,
  item_name       VARCHAR(100) NOT NULL,
  quantity        INT DEFAULT 0,
  condition       VARCHAR(20) CHECK (condition IN ('good','fair','poor')),
  purchase_date   DATE,
  supplier        VARCHAR(100),
  maintenance_due DATE,
  low_stock_alert INT DEFAULT 2,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 Backend API Routes

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Staff login → returns JWT |
| GET | `/api/auth/me` | Get current user profile |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | List all (with search & status filter) |
| POST | `/api/members` | Create new member |
| GET | `/api/members/:id` | Single member profile |
| PUT | `/api/members/:id` | Update member |
| DELETE | `/api/members/:id` | Soft delete (set inactive) |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | Daily log (filter by date) |
| POST | `/api/attendance/checkin` | Mark check-in |
| PUT | `/api/attendance/:id/checkout` | Mark check-out |
| GET | `/api/attendance/member/:id` | Monthly attendance per member |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/plans` | List all plans |
| POST | `/api/subscriptions/plans` | Create plan |
| GET | `/api/subscriptions` | All member subscriptions |
| POST | `/api/subscriptions` | Assign plan to member |
| PUT | `/api/subscriptions/:id` | Renew / expire |
| GET | `/api/subscriptions/expiring` | Expiring within 7 days |

### Staff
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/staff` | List all staff |
| POST | `/api/staff` | Add staff member |
| PUT | `/api/staff/:id` | Update staff |
| DELETE | `/api/staff/:id` | Remove staff |
| POST | `/api/staff/assign` | Assign trainer to member |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all items |
| POST | `/api/inventory` | Add item |
| PUT | `/api/inventory/:id` | Update item |
| DELETE | `/api/inventory/:id` | Remove item |
| GET | `/api/inventory/alerts` | Low stock + maintenance due |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary` | Dashboard KPIs |
| GET | `/api/reports/attendance` | Weekly/monthly chart data |
| GET | `/api/reports/subscriptions` | Expiring + overdue list |
| GET | `/api/reports/staff-attendance` | Staff attendance summary |
| GET | `/api/reports/export/csv` | CSV export |

---

## 🖥️ Frontend Pages & Components

### 1. Dashboard (`/`)
- KPI cards: Total active members, Today's attendance, Expiring soon, Low stock alerts
- Attendance bar chart (last 7 days) using **Recharts**
- Quick-action buttons: Mark attendance, Add member

### 2. Members (`/members`)
- Searchable & filterable table (active/inactive)
- Add/Edit member modal with photo upload
- Member detail page with subscription history and attendance summary

### 3. Attendance (`/attendance`)
- Date picker to view daily log
- Search by name or member ID to mark check-in/check-out
- Monthly view calendar per member

### 4. Subscriptions (`/subscriptions`)
- Plan management (create/edit plans)
- Assign plan to member with start/end date
- Expiry alert banner for subscriptions expiring ≤ 7 days
- Overdue list view

### 5. Staff (`/staff`)
- Staff list with role badges
- Add/edit staff form (role, shift info)
- Trainer-to-member assignment UI

### 6. Inventory (`/inventory`)
- Equipment table with condition badge
- Add/edit item drawer
- Maintenance due & low stock alert panel

### 7. Reports (`/reports`)
- Total active members count card
- Daily/weekly attendance **BarChart** (Recharts)
- Expiring subscriptions table
- Staff attendance summary table
- **Export to CSV** button (calls `/api/reports/export/csv`)

---

## 🔐 Authentication Flow

- JWT-based auth stored in `localStorage`
- Role-based access:
  - **Admin** — full access to all modules
  - **Trainer** — view members, mark attendance, view own assignments
  - **Reception** — mark attendance, view subscriptions, member lookup
- Protected routes in React using a `<PrivateRoute>` wrapper component
- `axios` interceptor attaches `Authorization: Bearer <token>` to every request

```js
// client/src/api/axiosInstance.js
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

## 🚀 Cursor Development Workflow (Step-by-Step)

> ✅ **PROJECT COMPLETE** — All phases implemented. Built with React 19 + Vite 8 + Tailwind CSS v4 (frontend) and Node.js + Express + **SQLite** (backend, zero-config, no PostgreSQL required).

### Week 1–2 — Project Setup & Auth ✅
- [x] Init Vite + React project, configure Tailwind CSS v4
- [x] Init Express server, connected to **SQLite** (better-sqlite3, no install needed)
- [x] Run database migrations — auto-runs on server start via `src/db/migrate.js`
- [x] Build `/api/auth/login` endpoint with JWT (8h expiry)
- [x] Build Login page UI + auth store (Zustand) — glassmorphism dark theme
- [x] Set up protected routes (`<PrivateRoute>`) and sidebar layout with role-based nav

### Week 3–4 — Members + Attendance (Phase 1 core) ✅
- [x] Build Members CRUD API + UI (searchable table, add/edit modal, auto member code GYM####)
- [x] Build Attendance API + check-in/check-out UI (daily log with duration tracking)
- [x] Member search by name/ID/phone on attendance page with live dropdown

### Week 5–6 — Subscriptions (Phase 1 complete) ✅
- [x] Build Subscription Plans API + UI (create plans, price display)
- [x] Assign plan to member + start/end date tracking
- [x] Expiry alert logic — banner shown when subscriptions expiring ≤ 7 days
- [x] Dashboard KPI cards (4 metrics) + Recharts attendance bar chart (last 7 days)

### Week 7–8 — Buffer & Polish (Phase 1) ✅
- [x] Form validation with `react-hook-form` on all modals (Members, Staff, Inventory, Subscriptions)
- [x] Toast notifications (`react-hot-toast`) — success/error on all CRUD operations
- [x] Mobile-responsive layout — flex sidebar + scrollable main content
- [x] Role-based access enforcement — Admin/Trainer/Reception route guards + sidebar filtering

### Week 9–10 — Staff + Inventory (Phase 2) ✅
- [x] Staff CRUD API + UI with role badges (admin/trainer/reception) — card grid layout
- [x] Trainer-to-member assignment UI + `/api/staff/assign` endpoint
- [x] Inventory CRUD API + condition badges (good/fair/poor) + quantity tracking
- [x] Maintenance & low-stock alert panel — dual alert cards with item lists

### Week 11–14 — Reports + Export + Final Polish ✅
- [x] Reports API endpoints (summary KPIs, attendance chart, subscription expiry, staff activity)
- [x] CSV export — server-side generation, downloads as `gym-report-YYYY-MM-DD.csv`
- [x] Staff attendance summary table (times marked, last active date)
- [x] Final QA complete — SQLite adapter tested, login verified, all 6 modules operational

---

## 🌐 Deployment (Recommended)

| Layer | Service | Notes |
|-------|---------|-------|
| Frontend | **Vercel** or **Netlify** | Deploy `client/` |
| Backend | **Railway** or **Render** | Deploy `server/` |
| Database | **Railway PostgreSQL** or **Supabase** | Managed PostgreSQL |
| File storage | **Cloudinary** (free tier) | Member photo uploads |

### Environment Variables (Actual Working Values)

**`client/.env`**
```
VITE_API_URL=http://localhost:3001/api
```

**`server/.env`**
```
PORT=3001
DATABASE_URL=sqlite://local    # Uses SQLite — no PostgreSQL needed!
JWT_SECRET=gym_management_super_secret_key_2024
CLIENT_URL=http://localhost:5174
```

> ⚠️ **Note:** The original guide specified PostgreSQL. The implementation uses **SQLite** via `better-sqlite3` for zero-config local development. The DB file is auto-created at `server/data/gym.db`.

---

## 💡 Cursor AI Prompts to Speed Up Development

Use these prompts directly in Cursor to scaffold code fast:

```
"Generate an Express controller for CRUD operations on the members table 
using node-postgres (pg). Table: members with columns id, full_name, phone, 
email, status, fitness_goal, health_notes, created_at"

"Create a React component for a members list page with Tailwind CSS. 
Include a search bar, active/inactive filter tabs, and a data table with 
columns: Photo, Name, Member ID, Phone, Status, Actions"

"Write a PostgreSQL query to get attendance counts grouped by day 
for the last 7 days, joining the members table for member name"

"Create a React form using react-hook-form and zod for adding a new 
member with fields: full_name, phone, email, dob, address, fitness_goal, 
health_notes, status (active/inactive)"

"Write an Express middleware that validates a JWT token and attaches 
the user role (admin/trainer/reception) to req.user"
```

---

## ✅ Definition of Done — Per Module

| Module | Status | Done When |
|--------|--------|-----------|
| **Members** | ✅ DONE | Add/edit/delete works, search & filter works, profile page shows subscription + attendance |
| **Attendance** | ✅ DONE | Staff can mark check-in/out by name or ID, daily log view works, monthly view per member works |
| **Subscriptions** | ✅ DONE | Plans created, assigned to members, expiry alerts show, history per member visible |
| **Staff** | ✅ DONE | CRUD works, roles enforced in UI, trainer-member assignments visible |
| **Inventory** | ✅ DONE | Items managed, maintenance reminders show, low-stock alerts trigger |
| **Reports** | ✅ DONE | Dashboard KPIs load, attendance chart renders, CSV export downloads correctly |

---

*Generated from the revised gym management plan — 6 modules, 2-phase build, no payment integration.*

---

## 🏁 Implementation Summary

| Item | Detail |
|------|--------|
| **Completed** | 2026-04-17 |
| **Frontend URL** | http://localhost:5174 |
| **Backend URL** | http://localhost:3001 |
| **Database** | SQLite (`server/data/gym.db`) — zero config |
| **Default Login** | admin@gym.com / admin123 |
| **Quick Start** | Double-click `START.bat` |
| **Total Modules** | 7 pages: Login, Dashboard, Members, Attendance, Subscriptions, Staff, Inventory, Reports |
| **Total API Routes** | 30+ REST endpoints across 6 routers |
| **Auth** | JWT (8h), role-based: admin / trainer / reception |