const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

const getAllStaff = async (req, res, next) => {
  try {
    const rows = pool._db.prepare(
      'SELECT id, full_name, role, phone, email, shift_info, status, created_at FROM staff ORDER BY created_at DESC'
    ).all();
    res.json(rows);
  } catch (err) { next(err); }
};

const createStaff = async (req, res, next) => {
  try {
    const { full_name, role, phone, email, password, shift_info } = req.body;
    const db = pool._db;
    const hashed = await bcrypt.hash(password || 'gym123', 10);
    const info = db.prepare(
      `INSERT INTO staff (full_name, role, phone, email, password, shift_info) VALUES (?,?,?,?,?,?)`
    ).run(full_name, role, phone, email, hashed, shift_info || null);
    const row = db.prepare('SELECT id, full_name, role, phone, email, shift_info, status FROM staff WHERE id=?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) { next(err); }
};

const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, role, phone, email, shift_info, status } = req.body;
    const db = pool._db;
    db.prepare(
      `UPDATE staff SET full_name=?, role=?, phone=?, email=?, shift_info=?, status=? WHERE id=?`
    ).run(full_name, role, phone, email, shift_info, status, id);
    const row = db.prepare('SELECT id, full_name, role, phone, email, shift_info, status FROM staff WHERE id=?').get(id);
    res.json(row);
  } catch (err) { next(err); }
};

const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    pool._db.prepare("UPDATE staff SET status='inactive' WHERE id=?").run(id);
    res.json({ message: 'Staff deactivated' });
  } catch (err) { next(err); }
};

const assignTrainer = async (req, res, next) => {
  try {
    const { trainer_id, member_id } = req.body;
    const db = pool._db;
    const info = db.prepare(
      `INSERT OR IGNORE INTO trainer_assignments (trainer_id, member_id) VALUES (?,?)`
    ).run(trainer_id, member_id);
    const row = db.prepare('SELECT * FROM trainer_assignments WHERE trainer_id=? AND member_id=?').get(trainer_id, member_id);
    res.status(201).json(row || { message: 'Already assigned' });
  } catch (err) { next(err); }
};

const getAssignments = async (req, res, next) => {
  try {
    const rows = pool._db.prepare(
      `SELECT ta.*, s.full_name as trainer_name, m.full_name as member_name, m.member_code
       FROM trainer_assignments ta
       JOIN staff s ON ta.trainer_id = s.id
       JOIN members m ON ta.member_id = m.id
       ORDER BY ta.assigned_on DESC`
    ).all();
    res.json(rows);
  } catch (err) { next(err); }
};

module.exports = { getAllStaff, createStaff, updateStaff, deleteStaff, assignTrainer, getAssignments };
