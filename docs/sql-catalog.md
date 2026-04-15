# 🗄️ SQL Catalog

> **Compact SQL reference for this project.**
> Each entry maps one SQL statement to its endpoint or runtime context.

---

## 📑 Table of Contents

- [Schema & Migrations](#-schema--migrations)
- [Products API](#-products-api)
- [Categories API](#-categories-api)
- [Recycle Bin API](#♻️-recycle-bin-api)
- [Dashboard API](#-dashboard-api)
- [Notes](#-notes)

---

## 🏗️ Schema & Migrations

### 🔷 Initial Tables — `db:init`

```sql
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  price             REAL    DEFAULT 0,
  description       TEXT,
  technical_details TEXT,
  image_path        TEXT
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT    DEFAULT '',
  color       TEXT    DEFAULT '#4ecdc4',
  icon        TEXT    DEFAULT 'package',
  created_at  TEXT    DEFAULT '2000-01-01 00:00:00'
);

-- Stock history table
CREATE TABLE IF NOT EXISTS stock_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    INTEGER NOT NULL,
  old_quantity  INTEGER NOT NULL,
  new_quantity  INTEGER NOT NULL,
  change_reason TEXT    DEFAULT '',
  changed_at    TEXT    DEFAULT '2000-01-01 00:00:00',
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT DEFAULT '',
  updated_at TEXT DEFAULT '2000-01-01 00:00:00'
);
```

---

### 🔶 Column Migrations — `db:migration`

#### Products — new columns

```sql
ALTER TABLE products ADD COLUMN category_id          INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN quantity              INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN low_stock_threshold  INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN stock_status         TEXT    DEFAULT 'in_stock';
ALTER TABLE products ADD COLUMN is_active            INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN created_at           TEXT    DEFAULT '2000-01-01 00:00:00';
ALTER TABLE products ADD COLUMN updated_at           TEXT    DEFAULT '2000-01-01 00:00:00';
ALTER TABLE products ADD COLUMN deleted_at           TEXT    DEFAULT NULL;
ALTER TABLE products ADD COLUMN recycle_expires_at   TEXT    DEFAULT NULL;
ALTER TABLE products ADD COLUMN deleted_category_id  INTEGER DEFAULT NULL;
ALTER TABLE products ADD COLUMN deleted_category_name TEXT   DEFAULT NULL;
```

#### Categories — new columns

```sql
ALTER TABLE categories ADD COLUMN is_deleted         INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN deleted_at         TEXT    DEFAULT NULL;
ALTER TABLE categories ADD COLUMN recycle_expires_at TEXT    DEFAULT NULL;
```

---

### 🟢 Backfill — `db:backfill`

```sql
-- Normalize timestamps
UPDATE products
SET created_at = datetime('now')
WHERE created_at = '2000-01-01 00:00:00' OR created_at IS NULL;

UPDATE products
SET updated_at = datetime('now')
WHERE updated_at = '2000-01-01 00:00:00' OR updated_at IS NULL;

-- Recompute stock status
UPDATE products
SET stock_status = CASE
  WHEN COALESCE(quantity, 0) = 0                                THEN 'out_of_stock'
  WHEN COALESCE(quantity, 0) <= COALESCE(low_stock_threshold,5) THEN 'low_stock'
  ELSE                                                               'in_stock'
END
WHERE stock_status IS NULL OR stock_status = '';
```

---

### 🌱 Seed — `db:seed`

```sql
-- Guard: only seed when table is empty
SELECT COUNT(*) AS count FROM categories;   -- [db:seed-check]

-- Insert default categories
INSERT INTO categories (name, description, color, icon)
VALUES (?, ?, ?, ?);
```

---

## 📦 Products API

### `GET /api/products` — List all active products

```sql
SELECT *
FROM   products
WHERE  COALESCE(is_active, 1) = 1
  AND  deleted_at IS NULL
ORDER  BY id DESC;
```

---

### `GET /api/products/:id` — Get single product

```sql
SELECT *
FROM   products
WHERE  id = ?
  AND  COALESCE(is_active, 1) = 1
  AND  deleted_at IS NULL;
```

---

### `POST /api/products` — Create product

```sql
-- 1. Insert product
INSERT INTO products
  (name, description, technical_details, image_path, price,
   category_id, quantity, low_stock_threshold, stock_status)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- 2. Log initial stock
INSERT INTO stock_history
  (product_id, old_quantity, new_quantity, change_reason)
VALUES (?, ?, ?, ?);

-- 3. Return created row
SELECT * FROM products WHERE id = ?;
```

---

### `PUT /api/products/:id` — Update product

```sql
-- 1. Fetch before update
SELECT *
FROM   products
WHERE  id = ?
  AND  COALESCE(is_active, 1) = 1
  AND  deleted_at IS NULL;

-- 2. Dynamic update (fields built in code)
UPDATE products
SET    ...dynamic fields...
WHERE  id = ?;

-- 3. Log stock change (if quantity changed)
INSERT INTO stock_history
  (product_id, old_quantity, new_quantity, change_reason)
VALUES (?, ?, ?, ?);

-- 4. Return updated row
SELECT *
FROM   products
WHERE  id = ?
  AND  COALESCE(is_active, 1) = 1
  AND  deleted_at IS NULL;
```

---

### `DELETE /api/products/:id` — Soft delete product

```sql
-- 1. Snapshot category before nulling it
SELECT p.id, p.category_id, c.name AS category_name
FROM   products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE  p.id = ? AND p.deleted_at IS NULL;

-- 2. Soft-delete
UPDATE products
SET    is_active            = 0,
       category_id          = NULL,
       deleted_at           = datetime('now'),
       recycle_expires_at   = datetime('now', '+30 days'),
       deleted_category_id  = ?,
       deleted_category_name = ?,
       updated_at           = datetime('now')
WHERE  id = ?;
```

---

### `POST /api/products/:id/duplicate` — Duplicate product

```sql
-- 1. Fetch source
SELECT *
FROM   products
WHERE  id = ?
  AND  COALESCE(is_active, 1) = 1
  AND  deleted_at IS NULL;

-- 2. Insert clone
INSERT INTO products
  (name, description, technical_details, image_path, price,
   category_id, quantity, low_stock_threshold, stock_status)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- 3. Return new row
SELECT * FROM products WHERE id = ?;
```

---

### `PUT /api/products/:id/stock` — Update stock level

```sql
-- 1. Validate product exists
SELECT *
FROM   products
WHERE  id = ?
  AND  COALESCE(is_active, 1) = 1
  AND  deleted_at IS NULL;

-- 2. Apply stock change
UPDATE products
SET    quantity   = ?,
       stock_status = ?,
       updated_at = CURRENT_TIMESTAMP
WHERE  id = ?;

-- 3. Record history
INSERT INTO stock_history
  (product_id, old_quantity, new_quantity, change_reason)
VALUES (?, ?, ?, ?);

-- 4. Return updated row
SELECT * FROM products WHERE id = ?;
```

---

### `GET /api/products/:id/stock-history` — Stock change log

```sql
SELECT *
FROM   stock_history
WHERE  product_id = ?
ORDER  BY datetime(changed_at) DESC, id DESC;
```

---

### `GET /api/products/:id/pdf` — PDF data fetch

```sql
SELECT * FROM products WHERE id = ?;
```

---

## 🏷️ Categories API

### 🔁 Purge Helper — runs before any category read/write

```sql
-- Hard-delete expired products
DELETE FROM products
WHERE  deleted_at IS NOT NULL
  AND  recycle_expires_at IS NOT NULL
  AND  datetime(recycle_expires_at) <= datetime('now');

-- Hard-delete expired categories
DELETE FROM categories
WHERE  COALESCE(is_deleted, 0) = 1
  AND  recycle_expires_at IS NOT NULL
  AND  datetime(recycle_expires_at) <= datetime('now');
```

---

### `GET /api/categories` — List all active categories

```sql
SELECT   c.*, COUNT(p.id) AS product_count
FROM     categories c
LEFT JOIN products p
       ON p.category_id = c.id AND COALESCE(p.is_active, 1) = 1
WHERE    COALESCE(c.is_deleted, 0) = 0
GROUP BY c.id
ORDER BY c.name ASC;
```

---

### `GET /api/categories/:id` — Get single category

```sql
SELECT *
FROM   categories
WHERE  id = ?
  AND  COALESCE(is_deleted, 0) = 0;
```

---

### `POST /api/categories` — Create or restore category

```sql
-- 1. Check for name conflict (case-insensitive)
SELECT * FROM categories WHERE LOWER(name) = LOWER(?);

-- 2a. If soft-deleted duplicate exists → restore it
UPDATE categories
SET    description       = ?,
       color             = ?,
       icon              = ?,
       is_deleted        = 0,
       deleted_at        = NULL,
       recycle_expires_at = NULL
WHERE  id = ?;

SELECT * FROM categories WHERE id = ?;   -- return restored

-- 2b. If no conflict → insert new
INSERT INTO categories (name, description, color, icon)
VALUES (?, ?, ?, ?);

SELECT * FROM categories WHERE id = ?;   -- return created
```

---

### `PUT /api/categories/:id` — Update category

```sql
-- Dynamic update (fields built in code)
UPDATE categories
SET    ...dynamic fields...
WHERE  id = ? AND COALESCE(is_deleted, 0) = 0;

-- Return updated row
SELECT *
FROM   categories
WHERE  id = ? AND COALESCE(is_deleted, 0) = 0;
```

---

### `DELETE /api/categories/:id` — Soft delete category + cascade

```sql
-- 1. Confirm category exists
SELECT *
FROM   categories
WHERE  id = ? AND COALESCE(is_deleted, 0) = 0;

-- 2. Count affected products
SELECT COUNT(*) AS count
FROM   products
WHERE  category_id = ? AND COALESCE(is_active, 1) = 1;

-- 3. Soft-delete all linked products
UPDATE products
SET    is_active             = 0,
       deleted_at            = datetime('now'),
       recycle_expires_at    = datetime('now', '+30 days'),
       deleted_category_id   = ?,
       deleted_category_name = ?,
       updated_at            = datetime('now')
WHERE  category_id = ? AND COALESCE(is_active, 1) = 1;

-- 4. Soft-delete the category
UPDATE categories
SET    is_deleted         = 1,
       deleted_at         = datetime('now'),
       recycle_expires_at = datetime('now', '+30 days')
WHERE  id = ?;
```

---

## ♻️ Recycle Bin API

### 🔁 Purge Helper — same as categories purge helper

```sql
DELETE FROM products
WHERE  deleted_at IS NOT NULL
  AND  recycle_expires_at IS NOT NULL
  AND  datetime(recycle_expires_at) <= datetime('now');

DELETE FROM categories
WHERE  COALESCE(is_deleted, 0) = 1
  AND  recycle_expires_at IS NOT NULL
  AND  datetime(recycle_expires_at) <= datetime('now');
```

---

### `GET /api/recycle-bin` — List deleted items

```sql
-- Deleted categories
SELECT id, name, description, color, icon, deleted_at, recycle_expires_at
FROM   categories
WHERE  COALESCE(is_deleted, 0) = 1
ORDER  BY datetime(deleted_at) DESC, id DESC;

-- Deleted products
SELECT id, name, description, image_path, price, quantity,
       deleted_at, recycle_expires_at,
       deleted_category_id, deleted_category_name
FROM   products
WHERE  deleted_at IS NOT NULL
ORDER  BY datetime(deleted_at) DESC, id DESC;
```

---

### `POST /api/recycle-bin/products/:id/restore` — Restore product

```sql
-- 1. Restore
UPDATE products
SET    is_active              = 1,
       category_id            = NULL,
       deleted_at             = NULL,
       recycle_expires_at     = NULL,
       deleted_category_id    = NULL,
       deleted_category_name  = NULL,
       updated_at             = datetime('now')
WHERE  id = ?;

-- 2. Return restored row
SELECT id, name, description, price, image_path,
       technical_details, category_id, quantity
FROM   products
WHERE  id = ?;
```

---

### `POST /api/recycle-bin/categories/:id/restore` — Restore category + products

```sql
-- 1. Restore linked products
UPDATE products
SET    is_active              = 1,
       category_id            = ?,
       deleted_at             = NULL,
       recycle_expires_at     = NULL,
       deleted_category_id    = NULL,
       deleted_category_name  = NULL,
       updated_at             = datetime('now')
WHERE  deleted_at IS NOT NULL
  AND  deleted_category_id = ?;

-- 2. Restore category
UPDATE categories
SET    is_deleted          = 0,
       deleted_at          = NULL,
       recycle_expires_at  = NULL
WHERE  id = ?;

-- 3. Return restored category
SELECT id, name, description, color, icon
FROM   categories
WHERE  id = ?;
```

---

### `DELETE /api/recycle-bin/products/:id/permanent` — Permanently delete product

```sql
-- 1. Confirm existence
SELECT id FROM products WHERE id = ?;

-- 2. Hard delete
DELETE FROM products WHERE id = ?;
```

---

## 📊 Dashboard API

### `GET /api/dashboard/stats` — Core KPIs

```sql
SELECT
  COUNT(*)                                                      AS totalProducts,
  COALESCE(SUM(price * quantity), 0)                           AS totalInventoryValue,
  COALESCE(AVG(price), 0)                                      AS averagePrice,
  COALESCE(SUM(quantity), 0)                                   AS totalUnits,
  COUNT(CASE WHEN quantity = 0 THEN 1 END)                     AS outOfStockCount,
  COUNT(CASE WHEN quantity > 0
              AND quantity <= low_stock_threshold THEN 1 END)   AS lowStockCount,
  COUNT(CASE WHEN quantity > low_stock_threshold THEN 1 END)   AS inStockCount
FROM products
WHERE COALESCE(is_active, 1) = 1;
```

---

### `GET /api/dashboard/stats` — Secondary Queries

#### Total category count

```sql
SELECT COUNT(*) AS totalCategories
FROM   categories
WHERE  COALESCE(is_deleted, 0) = 0;
```

#### Per-category breakdown

```sql
SELECT   c.id        AS categoryId,
         c.name      AS category,
         c.color,
         COUNT(p.id)               AS productCount,
         COALESCE(SUM(p.quantity), 0)         AS totalStock,
         COALESCE(SUM(p.price * p.quantity), 0) AS categoryValue
FROM     categories c
LEFT JOIN products p
       ON p.category_id = c.id AND COALESCE(p.is_active, 1) = 1
WHERE    COALESCE(c.is_deleted, 0) = 0
GROUP BY c.id
ORDER BY productCount DESC, c.name ASC;
```

#### Price range distribution

```sql
SELECT
  CASE
    WHEN price <   10 THEN '$0–$10'
    WHEN price <   50 THEN '$10–$50'
    WHEN price <  100 THEN '$50–$100'
    WHEN price <  500 THEN '$100–$500'
    ELSE                    '$500+'
  END       AS priceRange,
  COUNT(*)  AS count,
  MIN(price) AS sortPrice
FROM   products
WHERE  COALESCE(is_active, 1) = 1
GROUP  BY priceRange
ORDER  BY sortPrice ASC;
```

#### Stock status distribution

```sql
SELECT
  CASE
    WHEN quantity = 0                    THEN 'out_of_stock'
    WHEN quantity <= low_stock_threshold THEN 'low_stock'
    ELSE                                      'in_stock'
  END      AS status,
  COUNT(*) AS count
FROM   products
WHERE  COALESCE(is_active, 1) = 1
GROUP  BY status;
```

#### 5 most recently added products

```sql
SELECT   id, name, price, quantity, low_stock_threshold,
         stock_status, created_at
FROM     products
WHERE    COALESCE(is_active, 1) = 1
ORDER BY datetime(created_at) DESC, id DESC
LIMIT    5;
```

#### Low / out-of-stock alert list

```sql
SELECT   p.id,
         p.name,
         p.quantity,
         p.low_stock_threshold,
         p.stock_status,
         c.name  AS category_name,
         c.color AS category_color
FROM     products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE    COALESCE(p.is_active, 1) = 1
  AND    COALESCE(p.quantity, 0) <= COALESCE(p.low_stock_threshold, 5)
ORDER BY p.quantity ASC, p.name ASC;
```

---

## 📝 Notes

| Topic | Detail |
|---|---|
| **Dynamic SQL** | Field lists are built in application code for `PUT /api/products/:id` and `PUT /api/categories/:id` |
| **Query style** | Parameterized — placeholders `?` with positional args throughout |
| **Runtime** | All queries executed via `db.execute()` through the **libSQL** client |
| **Soft delete** | Products and categories are never hard-deleted by user action; `deleted_at` is set and a 30-day TTL is stored in `recycle_expires_at` |
| **Purge trigger** | Expired rows are hard-deleted at the start of any category or recycle-bin read/write via the purge helper |
| **Stock status** | Computed as `out_of_stock → low_stock → in_stock` based on `quantity` vs `low_stock_threshold` |

---

*Last updated: auto-generated from source — keep in sync with `db/index.ts`.*