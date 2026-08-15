const asyncHandler = require('../utils/asyncHandler');
const propertyService = require('../services/property.service');

const listProperties = asyncHandler(async (req, res) => {
  const result = await propertyService.listProperties(req.query);

  res.json({
    success: true,
    ...result
  });
});

const getPropertyBySlug = asyncHandler(async (req, res) => {
  const property = await propertyService.getProperty(req.params.slug);

  res.json({
    success: true,
    data: property
  });
});

const createProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.createProperty(
    req.body,
    req.files,
    req.user.id
  );

  res.status(201).json({
    success: true,
    data: property,
    message: 'Property created successfully'
  });
});

const updateProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.updateProperty(
    req.params.id,
    req.user.id,
    req.body,
    req.files
  );

  res.json({
    success: true,
    data: property,
    message: 'Property updated successfully'
  });
});

const deleteProperty = asyncHandler(async (req, res) => {
  await propertyService.deleteProperty(
    req.params.id,
    req.user.id
  );

  res.json({
    success: true,
    message: 'Property deleted successfully'
  });
});

const myListings = asyncHandler(async (req, res) => {
  const properties = await propertyService.myListings(req.user.id);

  res.json({
    success: true,
    data: properties
  });
});

const similarProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.similarProperties(
    req.params.slug
  );

  res.json({
    success: true,
    data: properties
  });
});

module.exports = {
  listProperties,
  getPropertyBySlug,
  createProperty,
  updateProperty,
  deleteProperty,
  myListings,
  similarProperties
};