require('dotenv').config();
const express = require('express');
const cors = require('cors');

const PdfPrinter = require('pdfmake');

const db = require('./db');
const { upload } = require('./cloudinary'); // ← Cloudinary upload

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    /\.vercel\.app$/
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// ─── PDF Setup ────────────────────────────────────────────
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};
const printer = new PdfPrinter(fonts);

// ─── Routes ───────────────────────────────────────────────

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT * FROM products ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('DB error GET /api/products:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// GET one product
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB error GET /api/products/:id:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// POST upload image — now uses Cloudinary ✅
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    // Cloudinary returns full URL in req.file.path
    res.json({ image_path: req.file.path });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST create product
app.post('/api/products', async (req, res) => {
  try {
    const {
      name,
      description = '',
      technical_details = '',
      image_path = '',
      price = 0,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const techDetailsStr =
      typeof technical_details === 'object'
        ? JSON.stringify(technical_details)
        : technical_details;

    const result = await db.execute({
      sql: `INSERT INTO products 
            (name, description, technical_details, image_path, price)
            VALUES (?, ?, ?, ?, ?)`,
      args: [name, description, techDetailsStr, image_path, price],
    });

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      name,
      description,
      technical_details: techDetailsStr,
      image_path,
      price,
    });
  } catch (err) {
    console.error('DB error POST /api/products:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, technical_details, image_path, price } =
      req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (technical_details !== undefined) {
      const techStr =
        typeof technical_details === 'object'
          ? JSON.stringify(technical_details)
          : technical_details;
      fields.push('technical_details = ?');
      values.push(techStr);
    }
    if (image_path !== undefined) { fields.push('image_path = ?'); values.push(image_path); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await db.execute({
      sql: `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [id],
    });

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error('DB error PUT /api/products/:id:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM products WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('DB error DELETE /api/products/:id:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET PDF
app.get('/api/products/:id/pdf', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [req.params.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    let techDetails = {};
    const rawTech = product.technical_details;

    if (rawTech && typeof rawTech === 'string') {
      if (rawTech.startsWith('{') && rawTech.endsWith('}')) {
        try { techDetails = JSON.parse(rawTech); }
        catch { techDetails = { Error: 'Invalid JSON format' }; }
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

    const formatKey = (key) =>
      key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const techLines = Object.entries(techDetails).map(([key, value]) => ({
      text: `${formatKey(key)}: ${value}`,
      style: 'techLine',
    }));

    const docDefinition = {
      pageMargins: [60, 80, 60, 60],
      content: [
        { text: product.name || 'Product', style: 'header' },
        {
          canvas: [{
            type: 'line', x1: 0, y1: 5, x2: 500, y2: 5,
            lineWidth: 1, lineColor: '#4299e1',
          }],
          margin: [0, 15, 0, 20],
        },
        { text: 'Product Information', style: 'sectionHeader' },
        {
          stack: [
            { text: `Price: $${(product.price || 0).toFixed(2)}`, style: 'infoLine' },
            { text: `Description: ${product.description || 'N/A'}`, style: 'infoLine' },
          ],
          margin: [0, 5, 0, 20],
        },
        { text: 'Technical Details', style: 'sectionHeader' },
        {
          stack: techLines.length > 0
            ? techLines
            : [{ text: 'No technical details available.', style: 'details' }],
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

// ─── Start Server ─────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app; // ← required for Vercel
// ```

// ---

// ## What Changed
// ```
// ✅ Removed local multer diskStorage  
// ✅ Removed local images/ folder setup
// ✅ Removed app.use('/images', express.static(...))
// ✅ Added Cloudinary upload via ./cloudinary.js
// ✅ Updated CORS for Vercel domains
// ✅ Added module.exports = app for Vercel
// ✅ Wrapped app.listen in require.main check
// ✅ Removed image_path from PDF (shows Cloudinary URL now)