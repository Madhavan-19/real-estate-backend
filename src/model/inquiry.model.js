const { query } = require('../config/db');

const findProperty = async (id) => {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const sql = isUuid
    ? 'SELECT id, owner_id FROM properties WHERE id = $1'
    : 'SELECT id, owner_id FROM properties WHERE slug = $1';

  const { rows } = await query(sql, [id]);
  return rows[0];
};

const findRecentInquiry = async (email) => {
  const { rows } = await query(
    `SELECT 1 FROM inquiries
     WHERE email = $1
     AND created_at > now() - interval '10 minutes'
     LIMIT 1`,
    [email]
  );

  return rows[0];
};

const create = async ({
  propertyId,
  userId,
  name,
  email,
  phone,
  message,
  ip,
}) => {
  const { rows } = await query(
    `INSERT INTO inquiries
     (property_id, user_id, name, email, phone, message, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, property_id, name, email, phone, message, status, created_at`,
    [propertyId, userId, name, email, phone, message || null, ip]
  );

  return rows[0];
};

const findByOwner = async (ownerId) => {
  const { rows } = await query(
    `SELECT i.id, i.property_id, p.title AS property_title,
            i.name, i.email, i.phone, i.message,
            i.status, i.created_at
     FROM inquiries i
     JOIN properties p ON p.id = i.property_id
     WHERE p.owner_id = $1
     ORDER BY i.created_at DESC`,
    [ownerId]
  );

  return rows;
};

module.exports = {
  findProperty,
  findRecentInquiry,
  create,
  findByOwner,
};