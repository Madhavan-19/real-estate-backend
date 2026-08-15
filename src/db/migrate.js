/**
 * Runs schema.sql against DATABASE_URL. Idempotent — safe to re-run
 * (every statement uses IF NOT EXISTS / CREATE OR REPLACE).
 *
 * Usage: npm run migrate
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Running migrations...');
  await pool.query(sql);
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
