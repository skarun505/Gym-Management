const pool = require('./pool');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function runMigrations() {
  const db = pool._db;

  // Run schema
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations/init.sql'),
    'utf8'
  );
  db.exec(sql);
  console.log('✅ Database schema ready');

  // Seed admin user if none exists
  const adminExists = db.prepare("SELECT id FROM staff WHERE email = 'admin@gym.com'").get();
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10);
    db.prepare(
      `INSERT INTO staff (full_name, role, email, password, status)
       VALUES ('Admin User', 'admin', 'admin@gym.com', ?, 'active')`
    ).run(hash);
    console.log('✅ Admin user seeded (admin@gym.com / admin123)');
  }

  // Seed subscription plans if none exist
  const planCount = db.prepare('SELECT COUNT(*) as c FROM subscription_plans').get();
  if (planCount.c === 0) {
    const insert = db.prepare(
      'INSERT INTO subscription_plans (plan_name, duration, price) VALUES (?,?,?)'
    );
    insert.run('Basic Monthly', 'monthly', 999.00);
    insert.run('Standard Quarterly', 'quarterly', 2499.00);
    insert.run('Premium Yearly', 'yearly', 8999.00);
    console.log('✅ Subscription plans seeded');
  }
}

module.exports = runMigrations;
