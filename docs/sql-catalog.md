# SQL Catalog

Compact SQL reference for this project. Each line maps one SQL statement to its endpoint or runtime context.

## Schema And Migration SQL

- [db:init] CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL DEFAULT 0, description TEXT, technical_details TEXT, image_path TEXT)
- [db:init] CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', color TEXT DEFAULT '#4ecdc4', icon TEXT DEFAULT 'package', created_at TEXT DEFAULT '2000-01-01 00:00:00')
- [db:init] CREATE TABLE IF NOT EXISTS stock_history (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, old_quantity INTEGER NOT NULL, new_quantity INTEGER NOT NULL, change_reason TEXT DEFAULT '', changed_at TEXT DEFAULT '2000-01-01 00:00:00', FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)
- [db:init] CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT DEFAULT '', updated_at TEXT DEFAULT '2000-01-01 00:00:00')
- [db:migration] ALTER TABLE products ADD COLUMN category_id INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL
- [db:migration] ALTER TABLE products ADD COLUMN quantity INTEGER DEFAULT 0
- [db:migration] ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5
- [db:migration] ALTER TABLE products ADD COLUMN stock_status TEXT DEFAULT 'in_stock'
- [db:migration] ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1
- [db:migration] ALTER TABLE products ADD COLUMN created_at TEXT DEFAULT '2000-01-01 00:00:00'
- [db:migration] ALTER TABLE products ADD COLUMN updated_at TEXT DEFAULT '2000-01-01 00:00:00'
- [db:migration] ALTER TABLE products ADD COLUMN deleted_at TEXT DEFAULT NULL
- [db:migration] ALTER TABLE products ADD COLUMN recycle_expires_at TEXT DEFAULT NULL
- [db:migration] ALTER TABLE products ADD COLUMN deleted_category_id INTEGER DEFAULT NULL
- [db:migration] ALTER TABLE products ADD COLUMN deleted_category_name TEXT DEFAULT NULL
- [db:migration] ALTER TABLE categories ADD COLUMN is_deleted INTEGER DEFAULT 0
- [db:migration] ALTER TABLE categories ADD COLUMN deleted_at TEXT DEFAULT NULL
- [db:migration] ALTER TABLE categories ADD COLUMN recycle_expires_at TEXT DEFAULT NULL
- [db:backfill] UPDATE products SET created_at = datetime('now') WHERE created_at = '2000-01-01 00:00:00' OR created_at IS NULL
- [db:backfill] UPDATE products SET updated_at = datetime('now') WHERE updated_at = '2000-01-01 00:00:00' OR updated_at IS NULL
- [db:backfill] UPDATE products SET stock_status = CASE WHEN COALESCE(quantity, 0) = 0 THEN 'out_of_stock' WHEN COALESCE(quantity, 0) <= COALESCE(low_stock_threshold, 5) THEN 'low_stock' ELSE 'in_stock' END WHERE stock_status IS NULL OR stock_status = ''
- [db:seed-check] SELECT COUNT(*) as count FROM categories
- [db:seed] INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)

## Products API SQL

- [GET /api/products] SELECT * FROM products WHERE COALESCE(is_active, 1) = 1 AND deleted_at IS NULL ORDER BY id DESC
- [GET /api/products/:id] SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL
- [POST /api/products] INSERT INTO products (name, description, technical_details, image_path, price, category_id, quantity, low_stock_threshold, stock_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
- [POST /api/products] INSERT INTO stock_history (product_id, old_quantity, new_quantity, change_reason) VALUES (?, ?, ?, ?)
- [POST /api/products] SELECT * FROM products WHERE id = ?
- [PUT /api/products/:id] SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL
- [PUT /api/products/:id] UPDATE products SET ...dynamic fields... WHERE id = ?
- [PUT /api/products/:id] INSERT INTO stock_history (product_id, old_quantity, new_quantity, change_reason) VALUES (?, ?, ?, ?)
- [PUT /api/products/:id] SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL
- [DELETE /api/products/:id] SELECT p.id, p.category_id, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ? AND p.deleted_at IS NULL
- [DELETE /api/products/:id] UPDATE products SET is_active = 0, category_id = NULL, deleted_at = datetime('now'), recycle_expires_at = datetime('now', '+30 days'), deleted_category_id = ?, deleted_category_name = ?, updated_at = datetime('now') WHERE id = ?
- [POST /api/products/:id/duplicate] SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL
- [POST /api/products/:id/duplicate] INSERT INTO products (name, description, technical_details, image_path, price, category_id, quantity, low_stock_threshold, stock_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
- [POST /api/products/:id/duplicate] SELECT * FROM products WHERE id = ?
- [PUT /api/products/:id/stock] SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL
- [PUT /api/products/:id/stock] UPDATE products SET quantity = ?, stock_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
- [PUT /api/products/:id/stock] INSERT INTO stock_history (product_id, old_quantity, new_quantity, change_reason) VALUES (?, ?, ?, ?)
- [PUT /api/products/:id/stock] SELECT * FROM products WHERE id = ?
- [GET /api/products/:id/stock-history] SELECT * FROM stock_history WHERE product_id = ? ORDER BY datetime(changed_at) DESC, id DESC
- [GET /api/products/:id/pdf] SELECT * FROM products WHERE id = ?

## Categories API SQL

- [categories:purge helper] DELETE FROM products WHERE deleted_at IS NOT NULL AND recycle_expires_at IS NOT NULL AND datetime(recycle_expires_at) <= datetime('now')
- [categories:purge helper] DELETE FROM categories WHERE COALESCE(is_deleted, 0) = 1 AND recycle_expires_at IS NOT NULL AND datetime(recycle_expires_at) <= datetime('now')
- [GET /api/categories] SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id AND COALESCE(p.is_active,1)=1 WHERE COALESCE(c.is_deleted,0)=0 GROUP BY c.id ORDER BY c.name ASC
- [GET /api/categories/:id] SELECT * FROM categories WHERE id = ? AND COALESCE(is_deleted,0)=0
- [POST /api/categories] SELECT * FROM categories WHERE LOWER(name)=LOWER(?)
- [POST /api/categories] UPDATE categories SET description = ?, color = ?, icon = ?, is_deleted = 0, deleted_at = NULL, recycle_expires_at = NULL WHERE id = ?
- [POST /api/categories] SELECT * FROM categories WHERE id = ?
- [POST /api/categories] INSERT INTO categories (name,description,color,icon) VALUES (?,?,?,?)
- [POST /api/categories] SELECT * FROM categories WHERE id = ?
- [PUT /api/categories/:id] UPDATE categories SET ...dynamic fields... WHERE id = ? AND COALESCE(is_deleted,0)=0
- [PUT /api/categories/:id] SELECT * FROM categories WHERE id = ? AND COALESCE(is_deleted,0)=0
- [DELETE /api/categories/:id] SELECT * FROM categories WHERE id = ? AND COALESCE(is_deleted,0)=0
- [DELETE /api/categories/:id] SELECT COUNT(*) as count FROM products WHERE category_id = ? AND COALESCE(is_active,1)=1
- [DELETE /api/categories/:id] UPDATE products SET is_active = 0, deleted_at = datetime('now'), recycle_expires_at = datetime('now', '+30 days'), deleted_category_id = ?, deleted_category_name = ?, updated_at = datetime('now') WHERE category_id = ? AND COALESCE(is_active,1)=1
- [DELETE /api/categories/:id] UPDATE categories SET is_deleted = 1, deleted_at = datetime('now'), recycle_expires_at = datetime('now', '+30 days') WHERE id = ?

## Recycle Bin API SQL

- [recycle-bin:purge helper] DELETE FROM products WHERE deleted_at IS NOT NULL AND recycle_expires_at IS NOT NULL AND datetime(recycle_expires_at) <= datetime('now')
- [recycle-bin:purge helper] DELETE FROM categories WHERE COALESCE(is_deleted, 0) = 1 AND recycle_expires_at IS NOT NULL AND datetime(recycle_expires_at) <= datetime('now')
- [GET /api/recycle-bin] SELECT id, name, description, color, icon, deleted_at, recycle_expires_at FROM categories WHERE COALESCE(is_deleted, 0) = 1 ORDER BY datetime(deleted_at) DESC, id DESC
- [GET /api/recycle-bin] SELECT id, name, description, image_path, price, quantity, deleted_at, recycle_expires_at, deleted_category_id, deleted_category_name FROM products WHERE deleted_at IS NOT NULL ORDER BY datetime(deleted_at) DESC, id DESC
- [POST /api/recycle-bin/products/:id/restore] UPDATE products SET is_active = 1, category_id = NULL, deleted_at = NULL, recycle_expires_at = NULL, deleted_category_id = NULL, deleted_category_name = NULL, updated_at = datetime('now') WHERE id = ?
- [POST /api/recycle-bin/products/:id/restore] SELECT id, name, description, price, image_path, technical_details, category_id, quantity FROM products WHERE id = ?
- [POST /api/recycle-bin/categories/:id/restore] UPDATE products SET is_active = 1, category_id = ?, deleted_at = NULL, recycle_expires_at = NULL, deleted_category_id = NULL, deleted_category_name = NULL, updated_at = datetime('now') WHERE deleted_at IS NOT NULL AND deleted_category_id = ?
- [POST /api/recycle-bin/categories/:id/restore] UPDATE categories SET is_deleted = 0, deleted_at = NULL, recycle_expires_at = NULL WHERE id = ?
- [POST /api/recycle-bin/categories/:id/restore] SELECT id, name, description, color, icon FROM categories WHERE id = ?
- [DELETE /api/recycle-bin/products/:id/permanent] SELECT id FROM products WHERE id = ?
- [DELETE /api/recycle-bin/products/:id/permanent] DELETE FROM products WHERE id = ?

## Dashboard API SQL

- [GET /api/dashboard/stats core] SELECT COUNT(*) as totalProducts, COALESCE(SUM(price*quantity),0) as totalInventoryValue, COALESCE(AVG(price),0) as averagePrice, COALESCE(SUM(quantity),0) as totalUnits, COUNT(CASE WHEN quantity=0 THEN 1 END) as outOfStockCount, COUNT(CASE WHEN quantity>0 AND quantity<=low_stock_threshold THEN 1 END) as lowStockCount, COUNT(CASE WHEN quantity>low_stock_threshold THEN 1 END) as inStockCount FROM products WHERE COALESCE(is_active,1)=1
- [GET /api/dashboard/stats secondary] SELECT COUNT(*) as totalCategories FROM categories WHERE COALESCE(is_deleted,0)=0
- [GET /api/dashboard/stats secondary] SELECT c.id as categoryId, c.name as category, c.color, COUNT(p.id) as productCount, COALESCE(SUM(p.quantity),0) as totalStock, COALESCE(SUM(p.price*p.quantity),0) as categoryValue FROM categories c LEFT JOIN products p ON p.category_id=c.id AND COALESCE(p.is_active,1)=1 WHERE COALESCE(c.is_deleted,0)=0 GROUP BY c.id ORDER BY productCount DESC, c.name ASC
- [GET /api/dashboard/stats secondary] SELECT CASE WHEN price<10 THEN '$0-$10' WHEN price<50 THEN '$10-$50' WHEN price<100 THEN '$50-$100' WHEN price<500 THEN '$100-$500' ELSE '$500+' END as priceRange, COUNT(*) as count, MIN(price) as sortPrice FROM products WHERE COALESCE(is_active,1)=1 GROUP BY priceRange ORDER BY sortPrice ASC
- [GET /api/dashboard/stats secondary] SELECT CASE WHEN quantity=0 THEN 'out_of_stock' WHEN quantity<=low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END as status, COUNT(*) as count FROM products WHERE COALESCE(is_active,1)=1 GROUP BY status
- [GET /api/dashboard/stats secondary] SELECT id, name, price, quantity, low_stock_threshold, stock_status, created_at FROM products WHERE COALESCE(is_active,1)=1 ORDER BY datetime(created_at) DESC, id DESC LIMIT 5
- [GET /api/dashboard/stats secondary] SELECT p.id, p.name, p.quantity, p.low_stock_threshold, p.stock_status, c.name as category_name, c.color as category_color FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE COALESCE(p.is_active,1)=1 AND COALESCE(p.quantity,0)<=COALESCE(p.low_stock_threshold,5) ORDER BY p.quantity ASC, p.name ASC

## Notes

- Dynamic SQL exists in two endpoints where field lists are built in code:
  - PUT /api/products/:id
  - PUT /api/categories/:id
- Parameterized query style uses placeholders and args in most paths.
- SQL is executed through libSQL client via db.execute.
