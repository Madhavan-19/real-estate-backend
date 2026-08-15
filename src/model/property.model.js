const { query } = require('../config/db');

const PUBLIC_COLUMNS = `
  id, owner_id, title, slug, description, property_type, listing_type, price,
  city, locality, address, latitude, longitude, bedrooms, bathrooms, area_sqft,
  images, amenities, status, views_count, created_at, updated_at
`;

const findById = async (id) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM properties WHERE id = $1`,
    [id]
  );
  return rows[0];
};

const findBySlug = async (slug) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM properties WHERE slug = $1`,
    [slug]
  );
  return rows[0];
};

const findSlug = async (slug) => {
  const { rows } = await query(
    'SELECT id FROM properties WHERE slug = $1',
    [slug]
  );
  return rows[0];
};

const create = async (data) => {
  const {
    ownerId, title, slug, description, propertyType, listingType,
    price, city, locality, address, latitude, longitude,
    bedrooms, bathrooms, areaSqft, images, amenities
  } = data;

  const { rows } = await query(
    `INSERT INTO properties
    (owner_id, title, slug, description, property_type, listing_type,
     price, city, locality, address, latitude, longitude,
     bedrooms, bathrooms, area_sqft, images, amenities)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING ${PUBLIC_COLUMNS}`,
    [
      ownerId, title, slug, description, propertyType, listingType,
      price, city, locality || null, address || null,
      latitude || null, longitude || null, bedrooms, bathrooms,
      areaSqft || null, JSON.stringify(images), JSON.stringify(amenities)
    ]
  );

  return rows[0];
};

const findOwned = async (id, userId) => {
  const { rows } = await query(
    'SELECT * FROM properties WHERE id = $1 AND owner_id = $2',
    [id, userId]
  );
  return rows[0];
};

const update = async (id, fields) => {
  const params = [];
  const sets = [];

  Object.entries(fields).forEach(([key, value]) => {
    params.push(['images', 'amenities'].includes(key)
      ? JSON.stringify(value)
      : value
    );
    sets.push(`${key} = $${params.length}`);
  });

  params.push(id);

  const { rows } = await query(
    `UPDATE properties
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING ${PUBLIC_COLUMNS}`,
    params
  );

  return rows[0];
};

const remove = async (id) => {
  await query('DELETE FROM properties WHERE id = $1', [id]);
};

const findByOwner = async (userId) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM properties
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
};

const findSimilar = async (property) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM properties
     WHERE city = $1
       AND property_type = $2
       AND id != $3
       AND status = 'active'
     ORDER BY ABS(price - $4)
     LIMIT 6`,
    [
      property.city,
      property.property_type,
      property.id,
      property.price
    ]
  );

  return rows;
};

const list = async (whereClause, params, limit, offset, orderBy) => {
  const dataParams = [...params, limit, offset];

  const data = await query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM properties
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${dataParams.length - 1}
     OFFSET $${dataParams.length}`,
    dataParams
  );

  const count = await query(
    `SELECT COUNT(*)::int AS total
     FROM properties ${whereClause}`,
    params
  );

  return {
    data: data.rows,
    total: count.rows[0].total
  };
};

const incrementViews = async (id) => {
  await query(
    'UPDATE properties SET views_count = views_count + 1 WHERE id = $1',
    [id]
  );
};

module.exports = {
  findById,
  findBySlug,
  findSlug,
  create,
  findOwned,
  update,
  remove,
  findByOwner,
  findSimilar,
  list,
  incrementViews
};