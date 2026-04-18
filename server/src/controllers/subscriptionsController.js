const pool = require('../db/pool');

const getPlans = async (req, res, next) => {
  try {
    const rows = pool._db.prepare('SELECT * FROM subscription_plans ORDER BY price ASC').all();
    res.json(rows);
  } catch (err) { next(err); }
};

const createPlan = async (req, res, next) => {
  try {
    const { plan_name, duration, price } = req.body;
    const db = pool._db;
    const info = db.prepare(
      'INSERT INTO subscription_plans (plan_name, duration, price) VALUES (?,?,?)'
    ).run(plan_name, duration, price);
    const row = db.prepare('SELECT * FROM subscription_plans WHERE id=?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) { next(err); }
};

const getAllSubscriptions = async (req, res, next) => {
  try {
    const rows = pool._db.prepare(
      `SELECT ms.*, m.full_name, m.member_code, sp.plan_name, sp.duration, sp.price
       FROM member_subscriptions ms
       JOIN members m ON ms.member_id = m.id
       JOIN subscription_plans sp ON ms.plan_id = sp.id
       ORDER BY ms.created_at DESC`
    ).all();
    res.json(rows);
  } catch (err) { next(err); }
};

const assignPlan = async (req, res, next) => {
  try {
    const { member_id, plan_id, start_date, end_date, notes } = req.body;
    const db = pool._db;
    const info = db.prepare(
      `INSERT INTO member_subscriptions (member_id, plan_id, start_date, end_date, notes) VALUES (?,?,?,?,?)`
    ).run(member_id, plan_id, start_date, end_date, notes || null);
    const row = db.prepare('SELECT * FROM member_subscriptions WHERE id=?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) { next(err); }
};

const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, end_date, notes } = req.body;
    const db = pool._db;
    db.prepare(
      `UPDATE member_subscriptions SET status=?, end_date=?, notes=? WHERE id=?`
    ).run(status, end_date, notes, id);
    const row = db.prepare('SELECT * FROM member_subscriptions WHERE id=?').get(id);
    res.json(row);
  } catch (err) { next(err); }
};

const getExpiring = async (req, res, next) => {
  try {
    const rows = pool._db.prepare(
      `SELECT ms.*, m.full_name, m.member_code, m.phone, sp.plan_name
       FROM member_subscriptions ms
       JOIN members m ON ms.member_id = m.id
       JOIN subscription_plans sp ON ms.plan_id = sp.id
       WHERE ms.status = 'active'
         AND ms.end_date BETWEEN date('now') AND date('now', '+7 days')
       ORDER BY ms.end_date ASC`
    ).all();
    res.json(rows);
  } catch (err) { next(err); }
};

module.exports = { getPlans, createPlan, getAllSubscriptions, assignPlan, updateSubscription, getExpiring };
