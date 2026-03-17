const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const PdfPrinter = require("pdfmake");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Database setup
const dbPath = path.join(__dirname, "products.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    return console.error("❌ Failed to connect to SQLite:", err.message);
  }
  console.log(`✅ Connected to SQLite database: ${dbPath}`);

  // Create table
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL DEFAULT 0,
      description TEXT,
      technical_details TEXT,
      image_path TEXT
    )
  `;

  db.run(createTableSql, (err) => {
    if (err) {
      return console.error("❌ Error creating table:", err.message);
    }
    console.log("✅ Table 'products' is ready");
  });
});





// Middleware
app.use(cors());
app.use(express.json()); // Modern replacement for bodyParser.json()
app.use("/images", express.static(path.join(__dirname, "images")));

// PDF Printer Setup (Helvetica only)
const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};
const printer = new PdfPrinter(fonts);

// ─── API ENDPOINTS ───────────────────────────────────────

// GET all products
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error("DB error GET /api/products:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(rows);
  });
});

// GET one product
app.get("/api/products/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("DB error GET /api/products/:id:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    if (!row) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(row);
  });
});
// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/'); // Save to server/images/
  },
  filename: (req, file, cb) => {
    // Keep original extension, prefix with timestamp
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Add this BEFORE your existing POST /api/products
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  
  // Return relative path for frontend
  const imagePath = `images/${req.file.filename}`;
  res.json({ image_path: imagePath });
});


// POST create product
app.post("/api/products", (req, res) => {
  const {
    name,
    description = "",
    technical_details = "",
    image_path = "",
    price = 0,
  } = req.body;

  // ✅ Convert object to JSON string if needed
  const techDetailsStr =
    typeof technical_details === "object"
      ? JSON.stringify(technical_details)
      : technical_details;

  if (!name) {
    return res.status(400).json({ error: "Product name is required" });
  }

  const sql = `
    INSERT INTO products (name, description, technical_details, image_path, price)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [name, description, techDetailsStr, image_path, price],
    function (err) {
      if (err) {
        console.error("DB error POST /api/products:", err);
        return res.status(500).json({ error: "Failed to create product" });
      }
      res.status(201).json({
        id: this.lastID,
        name,
        description,
        technical_details: techDetailsStr, // send back as string
        image_path,
        price,
      });
    }
  );
});

// PUT update product (partial updates)
// PUT: Update product
app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, technical_details, image_path, price } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    values.push(description);
  }
  if (technical_details !== undefined) {
    // ✅ Convert to JSON string if it's an object
    const techStr = typeof technical_details === 'object'
      ? JSON.stringify(technical_details)
      : technical_details; // already a string (or null/undefined)
    fields.push("technical_details = ?");
    values.push(techStr);
  }
  if (image_path !== undefined) {
    fields.push("image_path = ?");
    values.push(image_path);
  }
  if (price !== undefined) {
    fields.push("price = ?");
    values.push(price);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  values.push(id);
  const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;

  db.run(sql, values, function (err) {
    if (err) {
      console.error("DB error PUT /api/products/:id:", err);
      return res.status(500).json({ error: "Failed to update product" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    // Return updated product
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch updated product" });
      }
      res.json(row);
    });
  });
});

// DELETE product
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("DB error DELETE /api/products/:id:", err);
      return res.status(500).json({ error: "Failed to delete product" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  });
});

// ✅ FIXED: GET PDF for a product
// GET PDF for a product
// GET PDF for a product
app.get("/api/products/:id/pdf", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
    if (err) {
      console.error("DB error in PDF endpoint:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // ✅ SAFEST parsing: handle all cases
    let techDetails = {};
    const rawTech = product.technical_details;

    if (rawTech && typeof rawTech === 'string') {
      // Case 1: Proper JSON string → parse it
      if (rawTech.startsWith('{') && rawTech.endsWith('}')) {
        try {
          techDetails = JSON.parse(rawTech);
        } catch (e) {
          techDetails = { "Error": "Invalid JSON format" };
        }
      }
      // Case 2: [object Object] string → show error
      else if (rawTech === '[object Object]') {
        techDetails = { "Error": "Data was not saved as JSON. Update product to fix." };
      }
      // Case 3: Plain text → treat as single detail
      else {
        techDetails = { "Details": rawTech };
      }
    }
    // Case 4: Already an object (shouldn't happen, but safe)
    else if (rawTech && typeof rawTech === 'object') {
      techDetails = rawTech;
    }
    // Case 5: Empty or null
    else {
      techDetails = { "Details": "N/A" };
    }

    // Format key: "battery_life" → "Battery Life"
    const formatKey = (key) => {
      return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    };

    // Build clean list of technical details
    const techLines = Object.entries(techDetails).map(([key, value]) => ({
      text: `${formatKey(key)}: ${value}`,
      style: 'techLine'
    }));

    // PDF Document Definition
    const docDefinition = {
      pageMargins: [60, 80, 60, 60],
      content: [
        // Product Name
        { text: product.name || 'Product', style: 'header' },

        // Divider Line
        { 
          canvas: [{ 
            type: 'line', 
            x1: 0, y1: 5, x2: 500, y2: 5, 
            lineWidth: 1, 
            lineColor: '#4299e1' 
          }], 
          margin: [0, 15, 0, 20] 
        },

        // Basic Info
        { text: 'Product Information', style: 'sectionHeader' },
        {
          stack: [
            { text: `Price: $${(product.price || 0).toFixed(2)}`, style: 'infoLine' },
            { text: `Image Path: ${product.image_path || 'N/A'}`, style: 'infoLine' },
            { text: `Description: ${product.description || 'N/A'}`, style: 'infoLine' }
          ],
          margin: [0, 5, 0, 20]
        },

        // Technical Details
        { text: 'Technical Details', style: 'sectionHeader' },
        {
          stack: techLines.length > 0 
            ? techLines 
            : [{ text: 'No technical details available.', style: 'details' }],
          margin: [0, 5, 0, 20]
        }
      ],
      styles: {
        header: { fontSize: 26, bold: true, color: '#1a202c', margin: [0, 0, 0, 10] },
        sectionHeader: { fontSize: 18, bold: true, color: '#2d3748', margin: [0, 15, 0, 8] },
        infoLine: { fontSize: 12, color: '#4a5568', margin: [0, 2, 0, 2] },
        techLine: { fontSize: 12, color: '#2d3748', margin: [0, 2, 0, 2] },
        details: { fontSize: 12, color: '#718096', margin: [0, 2, 0, 2] }
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 12
      }
    };

    // Generate & send PDF
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${(product.name || 'product').replace(/\s+/g, '_')}_details.pdf"`
      );
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (e) {
      console.error("PDF generation failed:", e);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
});


// Start server
app.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Test PDF: GET http://localhost:${PORT}/api/products/1/pdf`);
});
