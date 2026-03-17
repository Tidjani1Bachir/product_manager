// server/db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Connect to SQLite database (creates file if not exists)
const dbPath = path.resolve(__dirname, "products.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database:", dbPath);
  }
});

// Create products table if it doesn't exist
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    technical_details TEXT,  // JSON string or plain text
    image_path TEXT          // Relative or absolute path to image
  )`,
    (err) => {
      if (err) {
        console.error("Error creating table:", err.message);
      } else {
        console.log("Products table ready");
      }
    }
  );
});

module.exports = db;
