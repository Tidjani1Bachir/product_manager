require('dotenv').config();
const { createClient } = require('@libsql/client');

// Create Turso client with connection timeout configuration
const db = createClient({ 
  url: process.env.TURSO_DATABASE_URL, 
  authToken: process.env.TURSO_AUTH_TOKEN,
  // Connection pool timeout: 15 seconds
  // This prevents hanging connections from blocking requests
  connectionTimeout: 15000,
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL DEFAULT 0,
      description TEXT,
      technical_details TEXT,
      image_path TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#4ecdc4',
      icon TEXT DEFAULT 'package',
      created_at TEXT DEFAULT '2000-01-01 00:00:00'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      old_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      change_reason TEXT DEFAULT '',
      changed_at TEXT DEFAULT '2000-01-01 00:00:00',
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT DEFAULT '',
      updated_at TEXT DEFAULT '2000-01-01 00:00:00'
    )
  `);

  // ⚠️ CURRENT_TIMESTAMP is not allowed as a default in ALTER TABLE on libsql/Turso.
  // Use a static placeholder string instead, then backfill with actual values below.
  const migrations = [
    "ALTER TABLE products ADD COLUMN category_id INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL",
    "ALTER TABLE products ADD COLUMN quantity INTEGER DEFAULT 0",
    "ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5",
    "ALTER TABLE products ADD COLUMN stock_status TEXT DEFAULT 'in_stock'",
    "ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE products ADD COLUMN created_at TEXT DEFAULT '2000-01-01 00:00:00'",  // static default ✅
    "ALTER TABLE products ADD COLUMN updated_at TEXT DEFAULT '2000-01-01 00:00:00'",  // static default ✅
    "ALTER TABLE products ADD COLUMN deleted_at TEXT DEFAULT NULL",
    "ALTER TABLE products ADD COLUMN recycle_expires_at TEXT DEFAULT NULL",
    "ALTER TABLE products ADD COLUMN deleted_category_id INTEGER DEFAULT NULL",
    "ALTER TABLE products ADD COLUMN deleted_category_name TEXT DEFAULT NULL",
    "ALTER TABLE categories ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE categories ADD COLUMN deleted_at TEXT DEFAULT NULL",
    "ALTER TABLE categories ADD COLUMN recycle_expires_at TEXT DEFAULT NULL",
  ];

  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch (err) {
      const m = String(err?.message || '').toLowerCase();
      if (!m.includes('duplicate') && !m.includes('exists')) {
        console.log('Migration note:', err.message);
      }
    }
  }

  // Backfill placeholder dates with real timestamps
  await db.execute(`UPDATE products SET created_at = datetime('now') WHERE created_at = '2000-01-01 00:00:00' OR created_at IS NULL`);
  await db.execute(`UPDATE products SET updated_at = datetime('now') WHERE updated_at = '2000-01-01 00:00:00' OR updated_at IS NULL`);

  await db.execute(`
    UPDATE products SET stock_status = CASE
      WHEN COALESCE(quantity, 0) = 0 THEN 'out_of_stock'
      WHEN COALESCE(quantity, 0) <= COALESCE(low_stock_threshold, 5) THEN 'low_stock'
      ELSE 'in_stock'
    END
    WHERE stock_status IS NULL OR stock_status = ''
  `);

  const catCount = await db.execute('SELECT COUNT(*) as count FROM categories');
  if (Number(catCount.rows[0]?.count || 0) === 0) {
    const cats = [
      ['Electronics', 'Electronic devices and gadgets', '#3b82f6', 'cpu'],
      ['Clothing', 'Apparel and fashion items', '#8b5cf6', 'shirt'],
      ['Food & Beverages', 'Food items and drinks', '#f59e0b', 'coffee'],
      ['Home & Garden', 'Home improvement and garden items', '#10b981', 'home'],
      ['Sports', 'Sports equipment and gear', '#ef4444', 'trophy'],
      ['Books', 'Books and publications', '#6366f1', 'book'],
      ['Other', 'Miscellaneous items', '#6b7280', 'package'],
    ];
    for (const c of cats) {
      await db.execute({ sql: 'INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)', args: c });
    }
  }

  console.log('✅ Database ready');
}

initDb().catch(console.error);
module.exports = db;