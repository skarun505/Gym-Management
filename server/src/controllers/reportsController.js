const pool = require('../db/pool');

const getSummary = async (req, res, next) => {
  try {
    const db = pool._db;
    const today = new Date().toISOString().split('T')[0];

    const totalMembers = db.prepare("SELECT COUNT(*) as count FROM members WHERE status='active'").get();
    const todayAttendance = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE created_at=?").get(today);
    const expiringSoon = db.prepare(
      `SELECT COUNT(*) as count FROM member_subscriptions
       WHERE status='active' AND end_date BETWEEN date('now') AND date('now', '+7 days')`
    ).get();
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= low_stock_alert').get();

    res.json({
      total_members: totalMembers.count,
      today_attendance: todayAttendance.count,
      expiring_soon: expiringSoon.count,
      low_stock_alerts: lowStock.count,
    });
  } catch (err) { next(err); }
};

const getAttendanceChart = async (req, res, next) => {
  try {
    const rows = pool._db.prepare(
      `SELECT created_at as date, COUNT(*) as count
       FROM attendance
       WHERE created_at >= date('now', '-7 days')
       GROUP BY created_at
       ORDER BY created_at ASC`
    ).all();
    res.json(rows);
  } catch (err) { next(err); }
};

const getSubscriptionReport = async (req, res, next) => {
  try {
    const db = pool._db;
    const expiring = db.prepare(
      `SELECT ms.*, m.full_name, m.phone, sp.plan_name
       FROM member_subscriptions ms
       JOIN members m ON ms.member_id=m.id
       JOIN subscription_plans sp ON ms.plan_id=sp.id
       WHERE ms.status='active' AND ms.end_date <= date('now', '+30 days')
       ORDER BY ms.end_date ASC`
    ).all();
    const overdue = db.prepare(
      `SELECT ms.*, m.full_name, m.phone, sp.plan_name
       FROM member_subscriptions ms
       JOIN members m ON ms.member_id=m.id
       JOIN subscription_plans sp ON ms.plan_id=sp.id
       WHERE ms.status='active' AND ms.end_date < date('now')
       ORDER BY ms.end_date ASC`
    ).all();
    res.json({ expiring, overdue });
  } catch (err) { next(err); }
};

const getStaffAttendanceSummary = async (req, res, next) => {
  try {
    const rows = pool._db.prepare(
      `SELECT s.id, s.full_name, s.role,
          COUNT(a.id) as times_marked,
          MAX(a.created_at) as last_active
       FROM staff s
       LEFT JOIN attendance a ON a.marked_by = s.id
       WHERE s.status='active'
       GROUP BY s.id, s.full_name, s.role
       ORDER BY times_marked DESC`
    ).all();
    res.json(rows);
  } catch (err) { next(err); }
};

const exportCSV = async (req, res, next) => {
  try {
    const rows = pool._db.prepare(
      `SELECT m.member_code, m.full_name, m.phone, m.email, m.status,
              sp.plan_name, ms.start_date, ms.end_date, ms.status as sub_status
       FROM members m
       LEFT JOIN member_subscriptions ms ON ms.member_id = m.id AND ms.status='active'
       LEFT JOIN subscription_plans sp ON ms.plan_id = sp.id
       ORDER BY m.created_at DESC`
    ).all();

    const headers = ['Member Code', 'Full Name', 'Phone', 'Email', 'Status', 'Plan', 'Start Date', 'End Date', 'Sub Status'];
    const csv = [
      headers.join(','),
      ...rows.map(r =>
        [r.member_code, r.full_name, r.phone, r.email, r.status, r.plan_name, r.start_date, r.end_date, r.sub_status]
          .map(v => `"${v || ''}"`)
          .join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="gym-report.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};

module.exports = { getSummary, getAttendanceChart, getSubscriptionReport, getStaffAttendanceSummary, exportCSV };
