# 🏋️ GymPro — Gym Management System

A modern, full-stack, multi-tenant **Gym Management SaaS** built with React + Vite + Supabase.

![GymPro](https://img.shields.io/badge/GymPro-v1.0-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Enabled-orange?style=for-the-badge)

---

## ✨ Features

### 🏢 Gym Owner Portal
- **Dashboard** — KPI cards, 7-day attendance chart, subscription reminder banners
- **Members** — Add/edit members, assign subscription plans, create member login credentials
- **Attendance** — Mark daily check-ins with member search
- **Subscriptions** — Plan management, 3-tier reminder system (24h / 3d / 7d), one-click Mark as Paid
- **Staff** — Manage trainers, reception, and staff schedules
- **Inventory** — Track gym equipment with low-stock alerts and maintenance dates
- **Reports** — Revenue charts, attendance analytics, CSV export
- **Settings** — Gym profile, custom theme color, subscription plans

### 📱 Member Portal
- **Dashboard** — Streak ring, 7-day calendar, one-tap Check In, subscription status
- **Workout Schedule** — Day-by-day exercise plan with logging
- **Progress** — Attendance & weight charts, personal bests, measurements tracking
- **Achievements** — 14 unlockable badges (streaks, milestones, special)
- **Profile** — Contact info, health notes, measurements history

### 🔐 Super Admin Portal
- Multi-gym management
- Create gyms with owner credentials
- Usage analytics across all gyms

### 🌟 Other Features
- **PWA** — Installable as a mobile app (Android auto-install, iOS instructions)
- **Subscription Reminders** — Automated 7d/3d/24h alerts for expiring memberships
- **White-labeling** — Each gym gets its own theme color
- **Role-based access** — super_admin / gym_owner / staff / member
- **Row Level Security** — Full Supabase RLS; gym data is completely isolated

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 + Custom design system |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Charts | Recharts |
| Forms | React Hook Form |
| Icons | Lucide React |
| Notifications | React Hot Toast |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account

### 1. Clone the repository
```bash
git clone https://github.com/skarun505/Gym-Management.git
cd Gym-Management
```

### 2. Set up environment variables
```bash
cd client
cp .env.example .env
```
Fill in your Supabase URL and anon key from your Supabase dashboard.

### 3. Install dependencies
```bash
cd client
npm install
```

### 4. Run the development server
```bash
npm run dev
```
App runs at `http://localhost:5173`

---

## 📁 Project Structure

```
GYM Management/
├── client/                  # React + Vite frontend
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   ├── sw.js            # Service worker
│   │   └── icon-512.svg     # App icon
│   └── src/
│       ├── components/
│       │   ├── layout/      # AppLayout, Sidebar, MemberLayout
│       │   └── SubscriptionReminderBanner.jsx
│       ├── pages/
│       │   ├── Dashboard/
│       │   ├── Members/
│       │   ├── Attendance/
│       │   ├── Subscriptions/
│       │   ├── Staff/
│       │   ├── Inventory/
│       │   ├── Reports/
│       │   ├── Settings/
│       │   ├── Member/      # Member portal pages
│       │   ├── SuperAdmin/
│       │   └── Login/
│       ├── store/           # Zustand auth store
│       ├── lib/             # Supabase client
│       └── utils/           # subscriptionReminders.js
├── supabase/
│   ├── functions/           # Edge functions (Deno)
│   │   ├── create-gym/
│   │   ├── process-checkin/
│   │   └── create-member-login/
│   └── migrations/          # SQL migration history
└── server/                  # Legacy Express (reference only)
```

---

## 🔑 User Roles

| Role | Access |
|------|--------|
| `super_admin` | All gyms, create new gyms |
| `gym_owner` | Full access to own gym |
| `staff` | Members, Attendance, Subscriptions |
| `member` | Member portal only |

---

## 📲 PWA Installation

The app is installable as a Progressive Web App:
- **Android/Chrome** — "Install App" banner appears after 30 seconds
- **iOS/Safari** — Step-by-step instructions: Share → Add to Home Screen

---

## 🔒 Security

- All database queries are protected by **Row Level Security (RLS)**
- Gym data is completely isolated by `gym_id`
- Edge functions verify JWT and caller role before any operation
- `.env` files containing API keys are gitignored

---

## 📄 License

MIT © 2026 GymPro
