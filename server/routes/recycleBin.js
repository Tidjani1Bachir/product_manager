const express = require('express');
const router = express.Router();
const db = require('../db');

const purgeExpiredRecycleBin = async () => {
  await db.execute(`
    DELETE FROM products
    WHERE deleted_at IS NOT NULL
      AND recycle_expires_at IS NOT NULL
      AND datetime(recycle_expires_at) <= datetime('now')
  `);

  await db.execute(`
    DELETE FROM categories
    WHERE COALESCE(is_deleted, 0) = 1
      AND recycle_expires_at IS NOT NULL
      AND datetime(recycle_expires_at) <= datetime('now')
  `);
};

router.get('/', async (req, res) => {
  try {
    await purgeExpiredRecycleBin();

    const categoriesResult = await db.execute(`
      SELECT id, name, description, color, icon, deleted_at, recycle_expires_at
      FROM categories
      WHERE COALESCE(is_deleted, 0) = 1
      ORDER BY datetime(deleted_at) DESC, id DESC
    `);

    const productsResult = await db.execute(`
      SELECT id, name, description, image_path, price, quantity,
             deleted_at, recycle_expires_at, deleted_category_id, deleted_category_name
      FROM products
      WHERE deleted_at IS NOT NULL
      ORDER BY datetime(deleted_at) DESC, id DESC
    `);

    res.json({
      categories: categoriesResult.rows || [],
      products: productsResult.rows || [],
    });
  } catch (error) {
    console.error('GET /api/recycle-bin error:', error);
    res.status(500).json({ error: 'Failed to fetch recycle bin data' });
  }
});

// Restore a deleted product
router.post('/products/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    // Restore only this product and place it under "Category None".
    await db.execute({
      sql: `
      UPDATE products
      SET is_active = 1,
          category_id = NULL,
          deleted_at = NULL,
          recycle_expires_at = NULL,
          deleted_category_id = NULL,
          deleted_category_name = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `,
      args: [id],
    });

    const result = await db.execute({
      sql: `
      SELECT id, name, description, price, image_path, technical_details, category_id, quantity
      FROM products
      WHERE id = ?
    `,
      args: [id],
    });

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/recycle-bin/products/:id/restore error:', error);
    res.status(500).json({ error: 'Failed to restore product' });
  }
});

// Restore a deleted category
router.post('/categories/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    // Restore products that were deleted as part of this category deletion.
    await db.execute({
      sql: `
      UPDATE products
      SET is_active = 1,
          category_id = ?,
          deleted_at = NULL,
          recycle_expires_at = NULL,
          deleted_category_id = NULL,
          deleted_category_name = NULL,
          updated_at = datetime('now')
      WHERE deleted_at IS NOT NULL
        AND deleted_category_id = ?
    `,
      args: [id, id],
    });

    await db.execute({
      sql: `
      UPDATE categories
      SET is_deleted = 0, deleted_at = NULL, recycle_expires_at = NULL
      WHERE id = ?
    `,
      args: [id],
    });

    const result = await db.execute({
      sql: `
      SELECT id, name, description, color, icon
      FROM categories
      WHERE id = ?
    `,
      args: [id],
    });

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/recycle-bin/categories/:id/restore error:', error);
    res.status(500).json({ error: 'Failed to restore category' });
  }
});

// Permanently delete a product from recycle bin
router.delete('/products/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify product exists first
    const checkResult = await db.execute({
      sql: `SELECT id FROM products WHERE id = ?`,
      args: [id],
    });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete the product permanently
    await db.execute({
      sql: `DELETE FROM products WHERE id = ?`,
      args: [id],
    });

    console.log(`Product ${id} permanently deleted`);
    res.json({ success: true, message: 'Product permanently deleted' });
  } catch (error) {
    console.error('DELETE /api/recycle-bin/products/:id/permanent error:', error);
    res.status(500).json({ error: 'Failed to permanently delete product' });
  }
});

module.exports = router;
