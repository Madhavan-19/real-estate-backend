const slugify = require('slugify');
const propertyModel = require('../model/property.model');
const ApiError = require('../utils/ApiError');

const makeUniqueSlug = async (title) => {
  const base = slugify(title, {
    lower: true,
    strict: true
  }).slice(0, 180);

  let slug = base;
  let count = 0;

  while (await propertyModel.findSlug(slug)) {
    count++;
    slug = `${base}-${count}`;
  }

  return slug;
};

const parseArray = (value, fieldName) => {
  if (!value) return [];

  try {
    return typeof value === 'string'
      ? JSON.parse(value)
      : value;
  } catch {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }
};

const getImagePaths = (files = []) =>
  files.map(
    (file) => `/uploads/properties/${file.filename}`
  );

const normalizeImages = (images) =>
  images
    .map((image) => {
      if (!image) return null;

      try {
        return new URL(image).pathname;
      } catch {
        return image.startsWith('/')
          ? image
          : `/${image}`;
      }
    })
    .filter(Boolean);

const listProperties = async (filters) => {
  const {
    city,
    propertyType,
    listingType,
    minPrice,
    maxPrice,
    bedrooms,
    q,
    sortBy = 'newest',
    page = 1,
    limit = 12
  } = filters;

  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.min(
    Math.max(Number(limit) || 12, 1),
    50
  );
  const offset = (currentPage - 1) * currentLimit;

  const where = [`status = 'active'`];
  const params = [];

  const addFilter = (condition, value) => {
    params.push(value);
    where.push(
      condition.replace('?', `$${params.length}`)
    );
  };

  if (city) addFilter('city ILIKE ?', city);
  if (propertyType) addFilter('property_type = ?', propertyType);
  if (listingType) addFilter('listing_type = ?', listingType);
  if (minPrice) addFilter('price >= ?', Number(minPrice));
  if (maxPrice) addFilter('price <= ?', Number(maxPrice));
  if (bedrooms) addFilter('bedrooms >= ?', Number(bedrooms));

  if (q) {
    addFilter(
      `search_vector @@ plainto_tsquery('english', ?)`,
      q
    );
  }

  const sortMap = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
    price_asc: 'price ASC',
    price_desc: 'price DESC'
  };

  const orderBy = sortMap[sortBy] || sortMap.newest;

  const result = await propertyModel.list(
    `WHERE ${where.join(' AND ')}`,
    params,
    currentLimit,
    offset,
    orderBy
  );

  return {
    data: result.data,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total: result.total,
      totalPages: Math.ceil(result.total / currentLimit),
      hasNextPage:
        currentPage * currentLimit < result.total
    }
  };
};

const getProperty = async (slug) => {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(slug);

  const property = isUuid
    ? await propertyModel.findById(slug)
    : await propertyModel.findBySlug(slug);

  if (!property)
    throw new ApiError(404, 'Property not found');

  propertyModel.incrementViews(property.id);

  return property;
};

const createProperty = async (data, files, userId) => {
  const slug = await makeUniqueSlug(data.title);

  const images = getImagePaths(files);
  const amenities = parseArray(data.amenities, 'amenities');

  return propertyModel.create({
    ...data,
    ownerId: userId,
    slug,
    listingType: data.listingType || 'sale',
    bedrooms: data.bedrooms || 0,
    bathrooms: data.bathrooms || 0,
    images,
    amenities
  });
};

const updateProperty = async (
  id,
  userId,
  body,
  files
) => {
  const property = await propertyModel.findOwned(id, userId);

  if (!property)
    throw new ApiError(
      404,
      'Property not found or you do not own it'
    );

  const fieldMap = {
    propertyType: 'property_type',
    listingType: 'listing_type',
    areaSqft: 'area_sqft'
  };

  const allowed = [
    'title',
    'description',
    'property_type',
    'listing_type',
    'price',
    'city',
    'locality',
    'address',
    'latitude',
    'longitude',
    'bedrooms',
    'bathrooms',
    'area_sqft',
    'images',
    'amenities',
    'status'
  ];

  const fields = {};

  Object.entries(body).forEach(([key, value]) => {
    if (key === 'existingImages') return;

    const column = fieldMap[key] || key;

    if (allowed.includes(column)) {
      fields[column] = value;
    }
  });

  if (body.amenities !== undefined) {
    fields.amenities = parseArray(
      body.amenities,
      'amenities'
    );
  }

  if (body.existingImages !== undefined || files?.length) {
    const existingImages = normalizeImages(
      parseArray(body.existingImages, 'existingImages')
    );

    fields.images = [
      ...existingImages,
      ...getImagePaths(files)
    ];
  }

  if (!Object.keys(fields).length)
    throw new ApiError(400, 'No valid fields to update');

  return propertyModel.update(id, fields);
};

const deleteProperty = async (id, userId) => {
  const property = await propertyModel.findOwned(id, userId);

  if (!property)
    throw new ApiError(
      404,
      'Property not found or you do not own it'
    );

  await propertyModel.remove(id);
};

const myListings = (userId) =>
  propertyModel.findByOwner(userId);

const similarProperties = async (slug) => {
  const property = await getProperty(slug);

  return propertyModel.findSimilar(property);
};

module.exports = {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  myListings,
  similarProperties
};