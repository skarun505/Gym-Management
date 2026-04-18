const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      "SELECT * FROM staff WHERE email = ? AND status = 'active'",
      [email]
    );

    const staff = result.rows[0];
    if (!staff) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, staff.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role, name: staff.full_name },
      process.env.JWT_SECRET || 'gym_secret_key',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: staff.id,
        name: staff.full_name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, shift_info, status FROM staff WHERE id = ?',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe };
