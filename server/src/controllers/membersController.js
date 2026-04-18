const pool = require('../db/pool');

const getAllMembers = async (req, res, next) => {
  try {
    const { search = '', status = '' } = req.query;
    const db = pool._db;
    let query = 'SELECT * FROM members WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      query += ` AND (full_name LIKE ? OR member_code LIKE ? OR phone LIKE ?)`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = ?`;
    }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = pool._db;

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const subscriptions = db.prepare(
      `SELECT ms.*, sp.plan_name, sp.duration, sp.price
       FROM member_subscriptions ms
       JOIN subscription_plans sp ON ms.plan_id = sp.id
       WHERE ms.member_id = ? ORDER BY ms.created_at DESC`
    ).all(id);

    const attendance = db.prepare(
      `SELECT * FROM attendance WHERE member_id = ? ORDER BY check_in DESC LIMIT 30`
    ).all(id);

    res.json({ ...member, subscriptions, attendance });
  } catch (err) {
    next(err);
  }
};

const createMember = async (req, res, next) => {
  try {
    const { full_name, dob, phone, email, address, photo_url, fitness_goal, health_notes, status } = req.body;
    const db = pool._db;

    const count = db.prepare('SELECT COUNT(*) as c FROM members').get().c;
    const member_code = `GYM${String(count + 1).padStart(4, '0')}`;

    const info = db.prepare(
      `INSERT INTO members (member_code, full_name, dob, phone, email, address, photo_url, fitness_goal, health_notes, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(member_code, full_name, dob || null, phone, email, address, photo_url, fitness_goal, health_notes, status || 'active');

    const newMember = db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newMember);
  } catch (err) {
    next(err);
  }
};

const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, dob, phone, email, address, photo_url, fitness_goal, health_notes, status } = req.body;
    const db = pool._db;

    db.prepare(
      `UPDATE members SET full_name=?, dob=?, phone=?, email=?, address=?,
       photo_url=?, fitness_goal=?, health_notes=?, status=?
       WHERE id=?`
    ).run(full_name, dob || null, phone, email, address, photo_url, fitness_goal, health_notes, status, id);

    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!updated) return res.status(404).json({ error: 'Member not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    pool._db.prepare("UPDATE members SET status='inactive' WHERE id=?").run(id);
    res.json({ message: 'Member deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllMembers, getMemberById, createMember, updateMember, deleteMember };
