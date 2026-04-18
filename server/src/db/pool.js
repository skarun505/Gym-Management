/**
 * SQLite database adapter with a PostgreSQL-compatible query interface.
 * Translates $1, $2, ... placeholders → ? for SQLite.
 * Returns { rows: [...] } just like node-postgres.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'gym.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`📂 SQLite DB: ${DB_PATH}`);

/**
 * Convert PostgreSQL $1,$2 placeholders to SQLite ?
 * Also strips PostgreSQL-specific casts like ::date, ::timestamp
 */
function convertQuery(sql) {
  return sql
    .replace(/\$\d+/g, '?')
    .replace(/::date/gi, '')
    .replace(/::timestamp/gi, '')
    .replace(/CURRENT_DATE/gi, "date('now')")
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/CURRENT_DATE\s*\+\s*INTERVAL\s*'(\d+)\s*days'/gi, "date('now', '+$1 days')")
    .replace(/INTERVAL\s*'7\s*days'/gi, "'+7 days'")
    .replace(/INTERVAL\s*'30\s*days'/gi, "'+30 days'")
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/EXTRACT\(MONTH FROM (\w+)\)/gi, "strftime('%m', $1)")
    .replace(/EXTRACT\(YEAR FROM (\w+)\)/gi, "strftime('%Y', $1)")
    .replace(/ON CONFLICT DO NOTHING/gi, 'OR IGNORE')
    .replace(/ON CONFLICT \(email\) DO NOTHING/gi, 'OR IGNORE');
}

const pool = {
  query: (sql, params = []) => {
    try {
      const converted = convertQuery(sql);
      const trimmed = converted.trim().toUpperCase();

      if (
        trimmed.startsWith('SELECT') ||
        trimmed.startsWith('WITH')
      ) {
        const stmt = db.prepare(converted);
        const rows = stmt.all(...params);
        return Promise.resolve({ rows });
      } else if (
        trimmed.startsWith('INSERT') ||
        trimmed.startsWith('UPDATE') ||
        trimmed.startsWith('DELETE')
      ) {
        // Handle RETURNING clause
        const hasReturning = /RETURNING\s+\*/i.test(converted);
        const hasReturningSpecific = /RETURNING\s+\w+/i.test(converted);

        if (hasReturning || hasReturningSpecific) {
          // Remove RETURNING clause for execution, then fetch last inserted/updated
          const withoutReturning = converted.replace(/\s+RETURNING\s+[^;]*/i, '');
          const stmt = db.prepare(withoutReturning);
          const info = stmt.run(...params);

          let rows = [];
          if (trimmed.startsWith('INSERT')) {
            const tableName = converted.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i)?.[1];
            if (tableName && info.lastInsertRowid) {
              const select = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
              rows = [select.get(info.lastInsertRowid)].filter(Boolean);
            }
          } else if (trimmed.startsWith('UPDATE')) {
            const tableName = converted.match(/UPDATE\s+(\w+)/i)?.[1];
            const whereMatch = converted.match(/WHERE\s+(\w+)\s*=\s*\?/i);
            if (tableName && whereMatch) {
              const col = whereMatch[1];
              const paramIdx = (converted.match(/\?/g) || []).length - 1;
              const id = params[paramIdx];
              if (id !== undefined) {
                const select = db.prepare(`SELECT * FROM ${tableName} WHERE ${col} = ?`);
                rows = [select.get(id)].filter(Boolean);
              }
            }
          }
          return Promise.resolve({ rows });
        } else {
          const stmt = db.prepare(converted);
          stmt.run(...params);
          return Promise.resolve({ rows: [] });
        }
      } else {
        // DDL: CREATE TABLE, etc — run as exec
        db.exec(converted);
        return Promise.resolve({ rows: [] });
      }
    } catch (err) {
      console.error('❌ DB Error:', err.message);
      console.error('   SQL:', sql.substring(0, 200));
      return Promise.reject(err);
    }
  },
  // Expose raw db for special cases
  _db: db,
};

module.exports = pool;
