const { query } = require('../config/db');

const findByEmail = async (email) => {
  const { rows } = await query(
    `SELECT id, name, email, phone, role, password_hash
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0];
};

const findById = async (id) => {
  const { rows } = await query(
    `SELECT id, name, email, phone, role, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
};

const create = async ({ name, email, passwordHash, phone }) => {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, role, created_at`,
    [name, email, passwordHash, phone || null]
  );
  return rows[0];
};

module.exports = { findByEmail, findById, create };