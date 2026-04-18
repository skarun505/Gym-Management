const pool = require('../db/pool');

const getDailyLog = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const db = pool._db;

    const rows = db.prepare(
      `SELECT a.*, m.full_name, m.member_code, m.photo_url
       FROM attendance a
       JOIN members m ON a.member_id = m.id
       WHERE a.created_at = ?
       ORDER BY a.check_in DESC`
    ).all(targetDate);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const checkIn = async (req, res, next) => {
  try {
    const { member_id } = req.body;
    const marked_by = req.user.id;
    const db = pool._db;
    const today = new Date().toISOString().split('T')[0];

    const existing = db.prepare(
      `SELECT id FROM attendance WHERE member_id=? AND created_at=? AND check_out IS NULL`
    ).get(member_id, today);

    if (existing) {
      return res.status(400).json({ error: 'Member already checked in today' });
    }

    const now = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO attendance (member_id, check_in, marked_by, created_at) VALUES (?,?,?,?)`
    ).run(member_id, now, marked_by, today);

    const row = db.prepare(
      `SELECT a.*, m.full_name, m.member_code
       FROM attendance a JOIN members m ON a.member_id=m.id WHERE a.id=?`
    ).get(info.lastInsertRowid);

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = pool._db;
    const now = new Date().toISOString();

    const info = db.prepare(
      `UPDATE attendance SET check_out=? WHERE id=? AND check_out IS NULL`
    ).run(now, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Attendance record not found or already checked out' });
    }
    const row = db.prepare('SELECT * FROM attendance WHERE id=?').get(id);
    res.json(row);
  } catch (err) {
    next(err);
  }
};

const getMemberAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;
    const m = String(month || new Date().getMonth() + 1).padStart(2, '0');
    const y = year || new Date().getFullYear();
    const db = pool._db;

    const rows = db.prepare(
      `SELECT * FROM attendance
       WHERE member_id=?
         AND strftime('%m', check_in) = ?
         AND strftime('%Y', check_in) = ?
       ORDER BY check_in DESC`
    ).all(id, m, String(y));
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDailyLog, checkIn, checkOut, getMemberAttendance };
