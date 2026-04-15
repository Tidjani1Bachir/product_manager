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
const result = await db.execute(`
SELECT c.*,COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id=c.id AND COALESCE(p.is_active,1)=1
WHERE COALESCE(c.is_deleted,0)=0
GROUP BY c.id ORDER BY c.name ASC
`);
res.json(result.rows);
} catch (error) {
console.error('GET /api/categories error:', error);
res.status(500).json({ error: 'Failed to fetch categories' });
}
});
router.get('/:id', async (req, res) => {
try {
await purgeExpiredRecycleBin();
const result = await db.execute({ sql:'SELECT * FROM categories WHERE id=? AND COALESCE(is_deleted,0)=0', args:[req.params.id] });
if (!result.rows.length) return res.status(404).json({ error:'Category not found' });
res.json(result.rows[0]);
} catch (error) {
console.error('GET /api/categories/:id error:', error);
res.status(500).json({ error:'Failed to fetch category' });
}
});
router.post('/', async (req, res) => {
try {
const { name, description, color, icon } = req.body;
if (!name || !String(name).trim()) return res.status(400).json({ error:'Category name is required' });
const existing = await db.execute({ sql:'SELECT * FROM categories WHERE LOWER(name)=LOWER(?)', args:[String(name).trim()] });
if (existing.rows.length && Number(existing.rows[0]?.is_deleted || 0) === 0) {
return res.status(409).json({ error:'Category already exists' });
}

if (existing.rows.length && Number(existing.rows[0]?.is_deleted || 0) === 1) {
	await db.execute({
		sql: `UPDATE categories
					SET description=?, color=?, icon=?, is_deleted=0, deleted_at=NULL, recycle_expires_at=NULL
					WHERE id=?`,
		args: [description || '', color || '#4ecdc4', icon || 'package', existing.rows[0].id],
	});

	const restored = await db.execute({ sql:'SELECT * FROM categories WHERE id=?', args:[existing.rows[0].id] });
	return res.status(201).json(restored.rows[0]);
}

const result = await db.execute({
sql:'INSERT INTO categories (name,description,color,icon) VALUES (?,?,?,?)',
args:[String(name).trim(), description || '', color || '#4ecdc4', icon || 'package'],
});
const created = await db.execute({ sql:'SELECT * FROM categories WHERE id=?', args:[Number(result.lastInsertRowid)] });
res.status(201).json(created.rows[0]);
} catch (error) {
console.error('POST /api/categories error:', error);
res.status(500).json({ error:'Failed to create category' });
}
});
router.put('/:id', async (req, res) => {
try {
const { id } = req.params;
const { name, description, color, icon } = req.body;
const fields = [], values = [];
if (name !== undefined) {
if (!String(name).trim()) return res.status(400).json({ error:'Category name cannot be empty' });
fields.push('name=?'); values.push(String(name).trim());
}
if (description !== undefined) { fields.push('description=?'); values.push(description); }
if (color !== undefined) { fields.push('color=?'); values.push(color); }
if (icon !== undefined) { fields.push('icon=?'); values.push(icon); }
if (!fields.length) return res.status(400).json({ error:'No fields to update' });
values.push(id);
await db.execute({ sql:`UPDATE categories SET ${fields.join(', ')} WHERE id=? AND COALESCE(is_deleted,0)=0`, args:values });
const updated = await db.execute({ sql:'SELECT * FROM categories WHERE id=? AND COALESCE(is_deleted,0)=0', args:[id] });
if (!updated.rows.length) return res.status(404).json({ error:'Category not found' });
res.json(updated.rows[0]);
} catch (error) {
console.error('PUT /api/categories/:id error:', error);
res.status(500).json({ error:'Failed to update category' });
}
});
router.delete('/:id', async (req, res) => {
try {
const { id } = req.params;
await purgeExpiredRecycleBin();

const categoryResult = await db.execute({
	sql: 'SELECT * FROM categories WHERE id=? AND COALESCE(is_deleted,0)=0',
	args: [id],
});

if (!categoryResult.rows.length) {
	return res.status(404).json({ error:'Category not found' });
}

const category = categoryResult.rows[0];

const relatedCountResult = await db.execute({
	sql: 'SELECT COUNT(*) as count FROM products WHERE category_id=? AND COALESCE(is_active,1)=1',
	args: [id],
});

const deletedProductsCount = Number(relatedCountResult.rows?.[0]?.count || 0);

await db.execute({
	sql: `UPDATE products
				SET is_active=0,
						deleted_at=datetime('now'),
						recycle_expires_at=datetime('now', '+30 days'),
						deleted_category_id=?,
						deleted_category_name=?,
						updated_at=datetime('now')
				WHERE category_id=? AND COALESCE(is_active,1)=1`,
	args: [id, category.name, id],
});

await db.execute({
	sql: `UPDATE categories
				SET is_deleted=1,
						deleted_at=datetime('now'),
						recycle_expires_at=datetime('now', '+30 days')
				WHERE id=?`,
	args: [id],
});

res.json({
	message:'Category and related products moved to recycle bin',
	deletedProductsCount,
	expiresInDays: 30,
});
} catch (error) {
console.error('DELETE /api/categories/:id error:', error);
res.status(500).json({ error:'Failed to delete category' });
}
});
module.exports = router;
