const pool = require('../db/pool');

const getAllItems = async (req, res, next) => {
  try {
    const rows = pool._db.prepare('SELECT * FROM inventory ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) { next(err); }
};

const createItem = async (req, res, next) => {
  try {
    const { item_name, quantity, condition, purchase_date, supplier, maintenance_due, low_stock_alert } = req.body;
    const db = pool._db;
    const info = db.prepare(
      `INSERT INTO inventory (item_name, quantity, condition, purchase_date, supplier, maintenance_due, low_stock_alert)
       VALUES (?,?,?,?,?,?,?)`
    ).run(item_name, quantity || 0, condition, purchase_date || null, supplier, maintenance_due || null, low_stock_alert || 2);
    const row = db.prepare('SELECT * FROM inventory WHERE id=?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) { next(err); }
};

const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { item_name, quantity, condition, purchase_date, supplier, maintenance_due, low_stock_alert } = req.body;
    const db = pool._db;
    db.prepare(
      `UPDATE inventory SET item_name=?, quantity=?, condition=?, purchase_date=?,
       supplier=?, maintenance_due=?, low_stock_alert=? WHERE id=?`
    ).run(item_name, quantity, condition, purchase_date || null, supplier, maintenance_due || null, low_stock_alert, id);
    const row = db.prepare('SELECT * FROM inventory WHERE id=?').get(id);
    res.json(row);
  } catch (err) { next(err); }
};

const deleteItem = async (req, res, next) => {
  try {
    pool._db.prepare('DELETE FROM inventory WHERE id=?').run(req.params.id);
    res.json({ message: 'Item removed' });
  } catch (err) { next(err); }
};

const getAlerts = async (req, res, next) => {
  try {
    const db = pool._db;
    const lowStock = db.prepare(
      'SELECT * FROM inventory WHERE quantity <= low_stock_alert ORDER BY quantity ASC'
    ).all();
    const maintenance = db.prepare(
      `SELECT * FROM inventory
       WHERE maintenance_due IS NOT NULL
         AND maintenance_due <= date('now', '+7 days')
       ORDER BY maintenance_due ASC`
    ).all();
    res.json({ low_stock: lowStock, maintenance_due: maintenance });
  } catch (err) { next(err); }
};

module.exports = { getAllItems, createItem, updateItem, deleteItem, getAlerts };
