require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PdfPrinter = require('pdfmake');
const db = require('./db');
const { upload } = require('./cloudinary');
const dashboardRoutes = require('./routes/dashboard');
const categoryRoutes = require('./routes/categories');
const recycleBinRoutes = require('./routes/recycleBin');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'https://product-manager-chi-eosin.vercel.app',
      /\.vercel\.app$/,
      'tauri://localhost',
      'https://tauri.localhost',
      'http://tauri.localhost',
    ];

    const isAllowed = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};
const printer = new PdfPrinter(fonts);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);

const toTech = (value) => (typeof value === 'object' && value !== null ? JSON.stringify(value) : (value || ''));
const toNum = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const stockStatus = (quantity, threshold) => (quantity === 0 ? 'out_of_stock' : quantity <= threshold ? 'low_stock' : 'in_stock');
const normalizeDateTime = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed} 12:00:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.replace('T', ' ').slice(0, 19);
  }

  return '';
};

app.get('/api/products', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT * FROM products
      WHERE COALESCE(is_active, 1) = 1
        AND deleted_at IS NULL
      ORDER BY id DESC
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('DB error GET /api/products:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL',
      args: [req.params.id],
    });
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB error GET /api/products/:id:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({ image_path: req.file.path });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const {
      name,
      description = '',
      technical_details = '',
      image_path = '',
      price = 0,
      category_id = null,
      quantity = 0,
      low_stock_threshold = 5,
      created_at,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const qty = Math.max(0, toNum(quantity, 0));
    const th = Math.max(0, toNum(low_stock_threshold, 5));
    const cat = category_id === null || category_id === undefined || category_id === '' ? null : toNum(category_id, null);
    const status = stockStatus(qty, th);
    const nowValue = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const createdAtValue = normalizeDateTime(created_at) || nowValue;

    const result = await db.execute({
      sql: `INSERT INTO products
            (name, description, technical_details, image_path, price, category_id, quantity, low_stock_threshold, stock_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [name, description, toTech(technical_details), image_path, toNum(price, 0), cat, qty, th, status, createdAtValue, nowValue],
    });

    const id = Number(result.lastInsertRowid);
    if (qty > 0) {
      await db.execute({
        sql: 'INSERT INTO stock_history (product_id, old_quantity, new_quantity, change_reason) VALUES (?, ?, ?, ?)',
        args: [id, 0, qty, 'Initial stock'],
      });
    }

    const created = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] });
    res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error('DB error POST /api/products:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL',
      args: [id],
    });
    if (!current.rows.length) return res.status(404).json({ error: 'Product not found' });

    const p = current.rows[0];
    const {
      name,
      description,
      technical_details,
      image_path,
      price,
      category_id,
      quantity,
      low_stock_threshold,
      created_at,
    } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (technical_details !== undefined) {
      fields.push('technical_details = ?');
      values.push(toTech(technical_details));
    }
    if (image_path !== undefined) {
      fields.push('image_path = ?');
      values.push(image_path);
    }
    if (price !== undefined) {
      fields.push('price = ?');
      values.push(toNum(price, 0));
    }
    if (category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(category_id === null || category_id === '' ? null : toNum(category_id, null));
    }
    if (created_at !== undefined) {
      const normalizedCreatedAt = normalizeDateTime(created_at);
      if (normalizedCreatedAt) {
        fields.push('created_at = ?');
        values.push(normalizedCreatedAt);
      }
    }

    const hasQuantityUpdate = quantity !== undefined;
    const hasThresholdUpdate = low_stock_threshold !== undefined;
    const qty = hasQuantityUpdate ? Math.max(0, toNum(quantity, 0)) : Math.max(0, toNum(p.quantity, 0));
    const th = hasThresholdUpdate ? Math.max(0, toNum(low_stock_threshold, 5)) : Math.max(0, toNum(p.low_stock_threshold, 5));

    if (hasQuantityUpdate) {
      fields.push('quantity = ?');
      values.push(qty);
    }
    if (hasThresholdUpdate) {
      fields.push('low_stock_threshold = ?');
      values.push(th);
    }
    if (hasQuantityUpdate || hasThresholdUpdate) {
      fields.push('stock_status = ?');
      values.push(stockStatus(qty, th));
    }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    fields.push('updated_at = ?');
    values.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
    values.push(id);

    await db.execute({ sql: `UPDATE products SET ${fields.join(', ')} WHERE id = ?`, args: values });

    const oldQty = Math.max(0, toNum(p.quantity, 0));
    if (hasQuantityUpdate && oldQty !== qty) {
      await db.execute({
        sql: 'INSERT INTO stock_history (product_id, old_quantity, new_quantity, change_reason) VALUES (?, ?, ?, ?)',
        args: [id, oldQty, qty, 'Product updated'],
      });
    }

    const updated = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL',
      args: [id],
    });
    if (!updated.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('DB error PUT /api/products/:id:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.execute({
      sql: `SELECT p.id, p.category_id, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.id = ? AND p.deleted_at IS NULL`,
      args: [id],
    });

    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });

    const product = existing.rows[0];
    const deletedCategoryId = product.category_id ?? -1;
    const deletedCategoryName = product.category_name || 'No Category';

    await db.execute({
      sql: `UPDATE products
            SET is_active = 0,
                category_id = NULL,
                deleted_at = datetime('now'),
                recycle_expires_at = datetime('now', '+30 days'),
                deleted_category_id = ?,
                deleted_category_name = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [deletedCategoryId, deletedCategoryName, id],
    });

    res.json({ message: 'Product moved to recycle bin', expiresInDays: 30 });
  } catch (err) {
    console.error('DB error DELETE /api/products/:id:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.post('/api/products/:id/duplicate', async (req, res) => {
  try {
    const original = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL',
      args: [req.params.id],
    });
    if (!original.rows.length) return res.status(404).json({ error: 'Product not found' });

    const p = original.rows[0];
    const qty = Math.max(0, toNum(p.quantity, 0));
    const th = Math.max(0, toNum(p.low_stock_threshold, 5));
    const status = stockStatus(qty, th);

    const result = await db.execute({
      sql: `INSERT INTO products
            (name, description, technical_details, image_path, price, category_id, quantity, low_stock_threshold, stock_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `${p.name} (Copy)`,
        p.description || '',
        p.technical_details || '',
        p.image_path || '',
        toNum(p.price, 0),
        p.category_id ?? null,
        qty,
        th,
        status,
      ],
    });

    const cloned = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    res.status(201).json(cloned.rows[0]);
  } catch (err) {
    console.error('Duplicate error:', err);
    res.status(500).json({ error: 'Failed to duplicate product' });
  }
});

app.put('/api/products/:id/stock', async (req, res) => {
  try {
    const { quantity, reason } = req.body;
    const qty = toNum(quantity, NaN);

    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ error: 'Valid quantity is required (>= 0)' });
    }

    const current = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1 AND deleted_at IS NULL',
      args: [req.params.id],
    });
    if (!current.rows.length) return res.status(404).json({ error: 'Product not found' });

    const p = current.rows[0];
    const oldQty = Math.max(0, toNum(p.quantity, 0));
    const th = Math.max(0, toNum(p.low_stock_threshold, 5));
    const status = stockStatus(qty, th);

    await db.execute({
      sql: 'UPDATE products SET quantity = ?, stock_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [qty, status, req.params.id],
    });

    await db.execute({
      sql: 'INSERT INTO stock_history (product_id, old_quantity, new_quantity, change_reason) VALUES (?, ?, ?, ?)',
      args: [req.params.id, oldQty, qty, reason || ''],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Stock update error:', err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

app.get('/api/products/:id/stock-history', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM stock_history WHERE product_id = ? ORDER BY datetime(changed_at) DESC, id DESC',
      args: [req.params.id],
    });
    res.json(result.rows || []);
  } catch (err) {
    console.error('Stock history error:', err);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

app.get('/api/products/:id/pdf', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [req.params.id] });
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });

    const product = result.rows[0];
    let techDetails = {};
    const rawTech = product.technical_details;

    if (rawTech && typeof rawTech === 'string') {
      if (rawTech.startsWith('{') && rawTech.endsWith('}')) {
        try {
          techDetails = JSON.parse(rawTech);
        } catch {
          techDetails = { Error: 'Invalid JSON format' };
        }
      } else if (rawTech === '[object Object]') {
        techDetails = { Error: 'Update product to fix.' };
      } else {
        techDetails = { Details: rawTech };
      }
    } else if (rawTech && typeof rawTech === 'object') {
      techDetails = rawTech;
    } else {
      techDetails = { Details: 'N/A' };
    }

    const formatKey = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const techLines = Object.entries(techDetails).map(([key, value]) => ({ text: `${formatKey(key)}: ${value}`, style: 'techLine' }));

    const docDefinition = {
      pageMargins: [60, 80, 60, 60],
      content: [
        { text: product.name || 'Product', style: 'header' },
        {
          canvas: [{ type: 'line', x1: 0, y1: 5, x2: 500, y2: 5, lineWidth: 1, lineColor: '#4299e1' }],
          margin: [0, 15, 0, 20],
        },
        { text: 'Product Information', style: 'sectionHeader' },
        {
          stack: [
            { text: `Price: $${Number(product.price || 0).toFixed(2)}`, style: 'infoLine' },
            { text: `Description: ${product.description || 'N/A'}`, style: 'infoLine' },
          ],
          margin: [0, 5, 0, 20],
        },
        { text: 'Technical Details', style: 'sectionHeader' },
        {
          stack: techLines.length > 0 ? techLines : [{ text: 'No technical details available.', style: 'details' }],
          margin: [0, 5, 0, 20],
        },
      ],
      styles: {
        header: { fontSize: 26, bold: true, color: '#1a202c', margin: [0, 0, 0, 10] },
        sectionHeader: { fontSize: 18, bold: true, color: '#2d3748', margin: [0, 15, 0, 8] },
        infoLine: { fontSize: 12, color: '#4a5568', margin: [0, 2, 0, 2] },
        techLine: { fontSize: 12, color: '#2d3748', margin: [0, 2, 0, 2] },
        details: { fontSize: 12, color: '#718096', margin: [0, 2, 0, 2] },
      },
      defaultStyle: { font: 'Helvetica', fontSize: 12 },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(product.name || 'product').replace(/\s+/g, '_')}_details.pdf"`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('✅ Database ready');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the running process and retry.`);
      process.exit(1);
    }

    throw err;
  });
}

module.exports = app;
