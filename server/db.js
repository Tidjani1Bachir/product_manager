require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,
      price             REAL DEFAULT 0,
      description       TEXT,
      technical_details TEXT,
      image_path        TEXT
    )
  `);
  console.log('✅ Database ready');
}

initDb().catch(console.error);

module.exports = db;