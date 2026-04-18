-- SQLite-compatible schema

CREATE TABLE IF NOT EXISTS members (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code  TEXT UNIQUE NOT NULL,
  full_name    TEXT NOT NULL,
  dob          TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  photo_url    TEXT,
  fitness_goal TEXT,
  health_notes TEXT,
  status       TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name  TEXT NOT NULL,
  role       TEXT CHECK (role IN ('admin','trainer','reception')),
  phone      TEXT,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  shift_info TEXT,
  status     TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,
  duration  TEXT CHECK (duration IN ('monthly','quarterly','yearly')),
  price     REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS member_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id  INTEGER REFERENCES members(id) ON DELETE CASCADE,
  plan_id    INTEGER REFERENCES subscription_plans(id),
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  status     TEXT DEFAULT 'active' CHECK (status IN ('active','expired','pending')),
  notes      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id  INTEGER REFERENCES members(id) ON DELETE CASCADE,
  check_in   TEXT NOT NULL DEFAULT (datetime('now')),
  check_out  TEXT,
  marked_by  INTEGER REFERENCES staff(id),
  created_at TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS trainer_assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id  INTEGER REFERENCES staff(id),
  member_id   INTEGER REFERENCES members(id),
  assigned_on TEXT DEFAULT (date('now')),
  UNIQUE(trainer_id, member_id)
);

CREATE TABLE IF NOT EXISTS inventory (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name       TEXT NOT NULL,
  quantity        INTEGER DEFAULT 0,
  condition       TEXT CHECK (condition IN ('good','fair','poor')),
  purchase_date   TEXT,
  supplier        TEXT,
  maintenance_due TEXT,
  low_stock_alert INTEGER DEFAULT 2,
  created_at      TEXT DEFAULT (datetime('now'))
);
